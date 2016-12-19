/*
Copyright (c) 2015 Georg Fritzsche <georg.fritzsche@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict";

let gCategory;
let bugzilla = bz.createClient();

let bugLists = new Map([
    ["commitments (p1)", {
      category: "active",
      searchParams: {
        whiteboard: "[measurement:client]",
        priority: "P1",
        resolution: "---",
      },
      columns: ["assigned_to", "cf_fx_points", "summary"],
    }],
    ["potentials (p2)", {
      category: "active",
      searchParams: {
        whiteboard: "[measurement:client]",
        priority: "P2",
        resolution: "---",
      },
      columns: ["assigned_to", "cf_fx_points", "summary"],
    }],
    ["mentored (wip)", {
      category: "active",
      searchParams: {
        resolution: "---",
        emailtype1: "regexp",
        email1: "gfritzsche@mozilla.com|alessio.placitelli@gmail.com",
        emailbug_mentor1: "1",
        emailtype2: "notequals",
        email2: "nobody@mozilla.org",
        emailassigned_to2: "1",
      },
      columns: ["assigned_to", "summary", "whiteboard"],
    }],
    ["tracking", {
      category: "active",
      searchParams: {
        resolution: "---",
        whiteboard: "[measurement:client:tracking]",
      },
      columns: ["assigned_to", "summary"],
    }],
    ["uplifts", {
      category: "active",
      searchParams: {
        whiteboard: "[measurement:client:uplift]",
      },
      columns: ["assigned_to", "summary"],
    }],
    ["project", {
      category: "active",
      searchParams: {
        resolution: "---",
        whiteboard: "[measurement:client:project]",
      },
      columns: ["summary"],
    }],
    ["backlog, quarter (p3)", {
      category: "p3",
      searchParams: {
        whiteboard: "[measurement:client]",
        priority: "P3",
        resolution: "---",
      },
      columns: ["assigned_to", "summary", "whiteboard"],
    }],
    ["backlog, year (p4)", {
      category: "p4",
      searchParams: {
        whiteboard: "[measurement:client]",
        priority: "P4",
        resolution: "---",
      },
      columns: ["assigned_to", "summary", "whiteboard"],
    }],
    ["backlog, low priority", {
      category: "p5",
      searchParams: {
        whiteboard: "[measurement:client]",
        priority: "P5",
        resolution: "---",
      },
      columns: ["assigned_to", "summary", "whiteboard"],
    }],
    ["mentored (free)", {
      category: "mentored",
      searchParams: {
        resolution: "---",
        emailtype1: "regexp",
        email1: "gfritzsche@mozilla.com|alessio.placitelli@gmail.com",
        emailbug_mentor1: "1",
        emailtype2: "equals",
        email2: "nobody@mozilla.org",
        emailassigned_to2: "1",
      },
      columns: ["summary", "whiteboard"],
    }],
    ["mentees", {
      category: "mentees",
      searchParams: {
        emailtype1: "regexp",
        email1: "gfritzsche@mozilla.com|alessio.placitelli@gmail.com",
        emailbug_mentor1: "1",
        emailtype2: "notequals",
        email2: "nobody@mozilla.org",
        emailassigned_to2: "1",
      },
      advancedSearch: {
        lastChangedNDaysAgo: 30,
      },
      columns: ["assigned_to", "status", "summary", "whiteboard"],
    }],
    ["recent", {
      category: "recent",
      searchParams: {
        whiteboard: "[measurement:client]",
      },
      advancedSearch: {
        lastChangedNDaysAgo: 30,
      },
      columns: ["last_change_time", "assigned_to", "status", "summary"],
      sortColumn: "last_change_time",
    }],
]);

var MS_IN_A_DAY = 24 * 60 * 60 * 1000;

function futureDate(date, offset) {
  return new Date(date.getTime() + offset);
}

function alias(email) {
  let shortNames = new Map([
    ["gfritzsche@mozilla.com", "georg"],
    ["alessio.placitelli@gmail.com", "alessio"],
    ["yarik.sheptykin@googlemail.com", "iaroslav"],
    ["robertthyberg@gmail.com", "robert thyberg"],
    ["areinald.bug@bolet.no-ip.com", "areinald"],
    ["penhlenh@gmail.com", "penh lenh"],
    ["pineapple.rice@gmail.com", "eric hu"],
    ["jdorlus@mozilla.com", "jdorlus"],
    ["bforehand@mozilla.com", "bforehand"],
    ["chutten@mozilla.com", "chutten"],
    ["nobody@mozilla.org", "-"],
  ]);

  return shortNames.get(email) || email;
}

function getBugField(bug, field) {
  let value = bug[field];
  switch (field) {
    case "assigned_to":
      return alias(value);
    case "whiteboard":
      return value.replace("[measurement:client]", "").trim();
    case "summary":
      return (value.length <= 100) ? value : (value.substring(0, 100) +  " ...");
    default: return value;
  }
}

function niceFieldName(fieldName) {
  let niceNames = new Map([
    ["assigned_to", "assignee"],
    ["cf_fx_points", "points"],
  ]);

  return niceNames.get(fieldName) || fieldName;
}

function searchBugs(searchParams, advancedSearch = {}) {
  return new Promise((resolve, reject) => {
    if ("lastChangedNDaysAgo" in advancedSearch) {
      let days = advancedSearch.lastChangedNDaysAgo;
      let date = futureDate(new Date(), - (days * MS_IN_A_DAY));
      searchParams.last_change_time = date.toISOString().substring(0, 10);
    }

    bugzilla.searchBugs(searchParams, (error, bugs) => {
      if (error) {
        reject(error);
      }

      resolve(bugs);
    });
  });
}

function removeAllChildNodes(node) {
  while(node.hasChildNodes()) {
    node.removeChild(node.lastChild);
  }
}

function createLink(text, url) {
  let link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("target", "_blank");
  link.appendChild(document.createTextNode(text));
  return link;
}

function createTableHeaders(titles) {
  let row = document.createElement("tr");
  for (let title of titles) {
    let cell = document.createElement("th");
    cell.appendChild(document.createTextNode(niceFieldName(title)));
    row.appendChild(cell);
  }
  return row;
}

function createTableRow(contents) {
  let row = document.createElement("tr");

  for (let content of contents) {
    let cell = document.createElement("td");
    if (typeof(content) === "function") {
      content(cell);
    } else {
      cell.appendChild(document.createTextNode(content));
    }
    row.appendChild(cell);
  }

  return row;
}

function compareBugsByAssignee(a, b) {
  a = a.assigned_to;
  b = b.assigned_to;

  if (a == b)
    return 0;
  if (a == "nobody@mozilla.org")
    return 1;
  if (b == "nobody@mozilla.org")
    return -1;

  return a.localeCompare(b);
}

function getSorter(listOptions) {
  switch (listOptions.sortColumn) {
    case "last_change_time":
      return (a, b) => - a.last_change_time.localeCompare(b.last_change_time);
    default:
      return compareBugsByAssignee;
  }
}

function addBugList(listName, listOptions, bugs) {
  console.log("addBugList - " + listName);

  bugs.sort(getSorter(listOptions));

  let content = document.getElementById("content");
  let section = document.createElement("div");
  section.className = "buglist";

  let table = document.createElement("table");
  section.appendChild(table);

  let caption = document.createElement("caption");
  caption.appendChild(document.createTextNode(listName));
  caption.setAttribute("title", "" + bugs.length + " bugs");
  table.appendChild(caption);

  let bugFields = listOptions.columns || ["assigned_to", "status", "summary"];
  table.appendChild(createTableHeaders([
    "#",
    ...[for (f of bugFields) niceFieldName(f)],
  ]));

  for (let bug of bugs) {
    let url = "https://bugzilla.mozilla.org/show_bug.cgi?id=" + bug.id;
    table.appendChild(createTableRow([
      (cell) => cell.appendChild(createLink("#", url)),
      ...[for (f of bugFields) getBugField(bug, f)],
    ]));
  }

  content.appendChild(section);
}

function update() {
  console.log("updating...");
  removeAllChildNodes(document.getElementById("content"));

  let promise = new Promise((resolve) => resolve());
  for (let entry of bugLists) {
    let [listName, listOptions] = entry;
    if (listOptions.category != gCategory) {
      continue;
    }

    promise = promise.then(() => searchBugs(listOptions.searchParams, listOptions.advancedSearch))
                     .then(bugs => addBugList(listName, listOptions, bugs));
  }
}

function createCategories() {
  let categories = new Set([for (bl of bugLists) bl[1].category]);
  let container = document.getElementById("categories");
  let form = document.createElement("form");

  let hash = window.location.hash.substring(1);
  gCategory = categories.has(hash) ? hash : categories.values().next().value;

  for (let title of categories) {
    let radio = document.createElement("input");
    radio.name = "category";
    radio.value = title;
    radio.type = "radio";
    radio.checked = (title === gCategory);
    radio.addEventListener("change", (evt) => {
      gCategory = evt.target.value;
      window.location = "#" + evt.target.value;
      update();
    }, false);

    let label = document.createElement("label");
    label.appendChild(radio);
    label.appendChild(document.createTextNode(title));

    form.appendChild(label);
  }

  container.appendChild(form);
}

function init() {
  createCategories();
  update();
}

init();
