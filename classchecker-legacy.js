async function main() {
    // <li class="ic-app-header__menu-list-item" aria-current="page">
    let button = document.createElement("li");
    button.classList.add("ic-app-header__menu-list-item");
    button.innerHTML = `
        <a id="global_nav_dashboard_link" class="ic-app-header__menu-list-link">
          <div class="menu-item-icon-container" aria-hidden="true">
            <img src="/myCanvas_pen.svg">
          </div>
          <div class="menu-item__text">
            My Work
          </div>
        </a>
      `;
      const bar = document.getElementById("menu");
      bar.append(button);



    // vars
    const MONTH_ARRAY = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11
    };


    // get class list page
    const page = "https://murraystate.instructure.com/#";
    const response = await fetch(page);
    const orHtml = await response.text();
    const orParser = new DOMParser();
    const doc = orParser.parseFromString(orHtml, "text/html");

    // collect classes
    let classCards = [];
    let classes = [];
    const cards = await waitForCards(doc);
    cards.forEach(card => {
        const child = card.querySelector(".ic-DashboardCard__header-term");
        let classi = card.querySelector(".ic-DashboardCard__header-subtitle");
        if (classi && classi.textContent) {
            classi = classi.textContent.trim().split("-")[0];
        } else {
            return;
        }
        if (child) {
            if (child.textContent != "User Groups") {
                classCards.push(card);
                classes.push(classi); 
            }
        }
    });
    console.log(classes);

    // get pages from classes
    const pages = classCards.map(card =>
        card.querySelector(".ic-DashboardCard__link").href + "/grades"
    );
    const responses = await Promise.all(
        pages.map(url => fetch(url))
    );
    const html = await Promise.all(
        responses.map(response => response.text())
    );
    // convert pages to DOM objects
    const docs = html.map(text => {
        const parser = new DOMParser();
        return parser.parseFromString(text, "text/html");
    });

    // get month and day as integers
    const currMonthIndex = new Date().getMonth();
    const currDayIndex = new Date().getDate();

    // collect graded assignments
    let graded = collect("assignment_graded");
    let ungraded = collect("student_assignment","assignment_graded")

    console.log(graded);
    console.log(ungraded);


    // collect assignments func
    function collect(className, nan="") {
        let i = 0;
        let graded = [];
        docs.forEach(doc => {
            let assignments;
            if (nan == "") {
                assignments = doc.querySelectorAll("." + className);
            } else {
                assignments = doc.querySelectorAll("." + className + ":not(." + nan + ")");
            }
            assignments.forEach(assignment => {
                let month = assignment.querySelector(".due");
                if (month) {
                    month = month.textContent.trim().split(" ")[0];
                    month = MONTH_ARRAY[month];
                } else {
                    month = "NAN";
                }
                let day = assignment.querySelector(".due");
                if (day) {
                    day = parseInt(day.textContent.trim().split(" ")[1], 10);
                } else {
                    day = "NAN";
                }
                let title = assignment.querySelector(".title");
                if (title && title.firstElementChild) {
                    title = title.firstElementChild.textContent.trim();
                } else {
                    title = "NAN";
                }
                let submitted = assignment.querySelector(".submitted");
                if (submitted) {
                    submitted = submitted.textContent.trim().split();
                    submitted = submitted[0] + " " + submitted [1];
                } else {
                    submitted = "NAN";
                }
                if (title != "NAN" && submitted != "NAN") {
                    graded.push([
                        title, month, day, submitted, classes[i]
                    ]);
                }
            });
            i++;
        });
        graded = graded.sort((a, b) => {
            if (a[2] !== b[2]) {
                return a[2] - b[2];
            }

            return a[1] - b[1];
        });
        return graded;
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

//document.addEventListener("DOMContentLoaded", function() {
    console.log("page loaded");
    main();
//});
