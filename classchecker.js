const CANVAS_URL = window.location.origin;

async function main() {
    // create open button
    // <li class="ic-app-header__menu-list-item" aria-current="page">
    let button = document.createElement("li");
    button.classList.add("ic-app-header__menu-list-item");
    button.innerHTML = `
        <a id="global_nav_dashboard_link" class="ic-app-header__menu-list-link pop_click">
          <div class="menu-item-icon-container" aria-hidden="true">
            <img class="pop_img" src="${chrome.runtime.getURL("myCanvas_pen.svg")}">
          </div>
          <div class="menu-item__text">
            My Work
          </div>
        </a>
      `;
      const bar = document.getElementById("menu");
      bar.append(button);

      // create popup
      // ic-DashboardCard__box__container
      let popup = document.createElement("div");
      popup.classList.add("myCanvas_pop");
      document.body.prepend(popup);
      popup.innerHTML = `
        <div class="pop_bar">
            <div class="pop_close">X</div>
        </div>
        <div class="pop_content">
        </div>
      `;

      // open popup, get data
      button.addEventListener("click", () => {
        popup.style.display = "block";
        loadClasses(popup);
      });

      // close popup
      const le_ex = popup.querySelector(".pop_close");
      le_ex.addEventListener("click", () => {
        popup.style.display = "none";
      });

    async function loadClasses(popup) {
        let popbox = popup.querySelector(".pop_content");
        popbox.innerHTML = "collecting classes...";
        // collect classes
        const response = await fetch(
            `${CANVAS_URL}/api/v1/courses?enrollment_state=active`
        );

        popbox.innerHTML = "gathering class data...";
        const cards = await response.json();
        let classCards = [];
        cards.forEach(card => {
            classCards.push([card.id, card.course_code.split("-")[0], card.name]);
        });

        popbox.innerHTML = "getting assignments...";
        // collect assignments
        let assignments = [];
        for (const card of classCards) {
            const response = await fetch(
                `${CANVAS_URL}/api/v1/courses/${card[0]}/assignments?include[]=submission`
            );
            const assigns = await response.json();
            assigns.forEach(assign => {
                let status;

                if (assign.submission?.submitted_at || assign.submission?.grade != null) {
                    status = "Submitted";
                } else if (assign.due_at && new Date(assign.due_at) < new Date()) {
                    status = "Late";
                } else {
                    status = "Unsubmitted";
                }

                assignments.push({
                    id: assign.id,
                    course_id: card[0],
                    course_code: card[1],
                    course_name: card[2],
                    points_possible: assign.points_possible ?? "NaN",
                    grade: assign.submission?.entered_grade,
                    due_at: assign.due_at,
                    name: assign.name,
                    late: assign.submission?.late ?? false,
                    missing: assign.submission?.missing ?? false,
                    submitted: assign.submission?.submitted_at ?? null,
                    status: status
                });
            });        
        }

        // sort
        assignments.sort((a, b) => {
            const statusOrder = {
                Late: 0,
                Unsubmitted: 1,
                Submitted: 2
            };

            // Sort by status first
            if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
            }

            // Then sort by due date
            if (a.due_at === null) return 1;
            if (b.due_at === null) return -1;

            return new Date(a.due_at) - new Date(b.due_at);
        });

        // segregate lists
        let late = [];
        let undone = [];
        let done = [];
        assignments.forEach(assignment => {
            if (assignment.status === "Late") {
                late.push(assignment);
            } else if (assignment.status === "Unsubmitted") {
                undone.push(assignment);
            } else {
                done.push(assignment);
            }
        });
        popbox.innerHTML = "finishing up...";

        let new_html = ``;
        // late
        new_html += `<div class="pop_entry_bar">Late</div>`;

        new_html += `
        <table>
            <thead>
                <tr>
                    <th>Class</th>
                    <th>Assignment</th>
                    <th>Due</th>
                    <th>Grade</th>
                </tr>
            </thead>
            <tbody>
        `;

        late.forEach(assignment => {
            new_html += `
                <tr>
                    <th>${assignment.course_code}</th>
                    <th>
                        <a href="${CANVAS_URL}}/courses/${assignment.course_id}/assignments/${assignment.id}/">
                            ${assignment.name}
                        </a>
                    </th>
                    <th>${formatCanvasDate(assignment.due_at)}</th>
                    <th>0/${assignment.points_possible}</th>
                </tr>
            `;
        });

        new_html += `
            </tbody>
        </table>
        `;
        // unsubmitted
        new_html += `<div class="pop_entry_bar">Unsubmitted</div>`;
        new_html += `
        <table>
            <thead>
                <tr>
                    <th>Class</th>
                    <th>Assignment</th>
                    <th>Due</th>
                    <th>Grade</th>
                </tr>
            </thead>

            <tbody>`;
        undone.forEach(und => {
            let grade;
            if (und.grade === null) {
                grade = `NaN/${und.points_possible ?? "NaN"}`;
            } else {
                grade = `0/${und.points_possible ?? "NaN"}`;
            }

            let due;
            if (und.due_at == null) {
                due = "NaN";
            } else {
                due = formatCanvasDate(und.due_at);
            }

            new_html += `
                <tr>
                    <th>${und.course_code}</th>
                    <th><a href="${CANVAS_URL}/courses/${und.course_id}/assignments/${und.id}/">${und.name}</a></th>
                    <th>${due}</th>
                    <th>${grade}</th>
                </tr>
            `;
        });
        new_html += "</tbody></table>";

        // submitted
        new_html += `<div class="pop_entry_bar">Submitted</div>`;
        new_html += `
        <table>
            <thead>
                <tr>
                    <th>Class</th>
                    <th>Assignment</th>
                    <th>Due</th>
                    <th>Submitted</th>
                    <th>Grade</th>
                </tr>
            </thead>

            <tbody>`;
        done.forEach(und => {
            let submitted;
            let grade;
            let due;
            if (und.submitted == null) {
                submitted = "NaN";
            } else {
                submitted = formatCanvasDate(und.submitted);
            }
            if (und.grade == null) {
                grade = "NaN";
            } else if (und.grade.includes("%")) {
                grade = und.grade;
            } else {
                grade = `${und.grade} / ${und.points_possible}`;
            }
            if (und.due_at == null) {
                due = "NaN";
            } else {
                due = formatCanvasDate(und.due_at);
            }
            new_html += `
                <tr>
                    <th>${und.course_code}</th>
                    <th><a href="${CANVAS_URL}/courses/${und.course_id}/assignments/${und.id}/">${und.name}</a></th>
                    <th>${due}</th>
                    <th>${submitted}</th>
                    <th>${grade}</th>
                </tr>
            `;
        });
        new_html += "</tbody></table>";

        popbox.innerHTML = new_html;

        let tables = popbox.querySelectorAll("table");
        tables.forEach(table => {
            table.style.tableLayout = "fixed";
        });
    }
}


function waitForCards(doc) {
    return new Promise(resolve => {
        const check = () => {
            const cards = doc.querySelectorAll(".ic-DashboardCard");

            if (cards.length > 0) {
                resolve(cards);
            } else {
                setTimeout(check, 100);
            }
        };

        check();
    });
}

function formatCanvasDate(dateString) {
    if (!dateString) return "NaN";

    const date = new Date(dateString);

    return date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
}

//document.addEventListener("DOMContentLoaded", function() {
    console.log("page loaded");
    main();
//});
