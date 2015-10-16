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

let bugzilla = bz.createClient();

let bugLists = new Map([
    ["commitments (p1)", {
      searchParams: {
        whiteboard: "[measurement:client]",
        priority: "P1",
        resolution: "---",
      },
      columns: ["assigned_to", "status", "cf_fx_points", "summary"],
    }],
    ["potentials (p2)", {
      searchParams: {
        whiteboard: "[measurement:client]",
        priority: "P2",
        resolution: "---",
      },
      columns: ["assigned_to", "status", "cf_fx_points", "summary"],
    }],
    ["mentored (wip)", {
      searchParams: {
        resolution: "---",
        emailtype1: "regexp",
        email1: "gfritzsche@mozilla.com|alessio.placitelli@gmail.com",
        emailbug_mentor1: "1",
        emailtype2: "notequals",
        email2: "nobody@mozilla.org",
        emailassigned_to2: "1",
      },
    }],
    ["backlog (p3)", {
      searchParams: {
        whiteboard: "[measurement:client]",
        priority: "P3",
        resolution: "---",
      },
    }],
    ["mentored (free)", {
      searchParams: {
        resolution: "---",
        emailtype1: "regexp",
        email1: "gfritzsche@mozilla.com|alessio.placitelli@gmail.com",
        emailbug_mentor1: "1",
        emailtype2: "equals",
        email2: "nobody@mozilla.org",
        emailassigned_to2: "1",
      },
    }],
]);

function alias(email) {
  let shortNames = new Map([
    ["gfritzsche@mozilla.com", "georg"],
    ["alessio.placitelli@gmail.com", "alessio"],
    ["nobody@mozilla.org", "-"],
  ]);

  return shortNames.get(email) || email;
}

function getBugField(bug, field) {
  let value = bug[field];
  switch (field) {
    case "assigned_to": return alias(value);
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

function searchBugs(searchParams) {
  return new Promise((resolve, reject) => {
    bugzilla.searchBugs(searchParams, (error, bugs) => {
      if (error) {
        reject(error);
      }

      resolve(bugs);
    });
  });
}

function addBugList(listName, listOptions, bugs) {
  console.log("addBugList - " + listName);

  bugs = bugs.filter(b => b.resolution == "");
  bugs.sort((a, b) => a.status.localeCompare(b.status));

  let content = document.getElementById("content");
  let section = document.createElement("div");
  section.className = "buglist";

  let table = document.createElement("table");
  section.appendChild(table);

  let caption = document.createElement("caption");
  caption.appendChild(document.createTextNode(listName));
  table.appendChild(caption);

  let row = document.createElement("tr");
  let bugFields = listOptions.columns || ["assigned_to", "status", "summary"];
  for (let field of ["#", ...bugFields]) {
    let cell = document.createElement("th");
    cell.appendChild(document.createTextNode(niceFieldName(field)));
    row.appendChild(cell);
  }
  table.appendChild(row);

  for (let bug of bugs) {
    let row = document.createElement("tr");

    let cell = document.createElement("td");
    let link = document.createElement("a");
    link.setAttribute("href", "https://bugzilla.mozilla.org/show_bug.cgi?id=" + bug.id);
    link.setAttribute("target", "_blank");
    link.appendChild(document.createTextNode("#"));
    cell.appendChild(link);
    row.appendChild(cell);

    for (let field of bugFields) {
      let cell = document.createElement("td");
      cell.appendChild(document.createTextNode(getBugField(bug, field)));
      row.appendChild(cell);
    }
    table.appendChild(row);
  }

  content.appendChild(section);
}

function update() {
  console.log("updating...");
  let promise = new Promise((resolve) => resolve());

  for (let entry of bugLists) {
    let [listName, listOptions] = entry;
    promise = promise.then(() => searchBugs(listOptions.searchParams))
                     .then(bugs => addBugList(listName, listOptions, bugs));
  }
}

update();
