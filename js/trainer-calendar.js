document.addEventListener("DOMContentLoaded", async function () {});

function toggleScheduleTrainer(btn) {
  const trainerCalendarBody = document.querySelector(".trainer-calendar-body");
  const trainerCalendarContainer = document.querySelector(
    ".trainer-calendar-container"
  );

  if (btn.innerText === "Ẩn") {
    btn.innerText = "Hiện";
    trainerCalendarBody.style.display = "none";
    trainerCalendarContainer.style.height = "fit-content";
  } else {
    btn.innerText = "Ẩn";
    trainerCalendarBody.style.display = "block";
    trainerCalendarContainer.style.height = "calc(100vh / 2 - 30px)";
  }
}

function generateTrainerTableBody() {
  let tbody = document.getElementById("trainer-table-body");
  tbody.innerHTML = "";

  console.log(" trainerData.forEach ~ trainerData:", trainerData);

  trainerData.forEach((stu, index) => {
    let tr = document.createElement("tr");
    let td = document.createElement("td");

    td.innerHTML = `${stu.name} <br /> ${stu.timezone}`;
    td.style = "background: #07bcd0; font-weight: bold; z-index: 1;";
    tr.appendChild(td);

    for (let i = 0; i <= 6; i++) {
      let tdInput = document.createElement("td");
      tdInput.style.padding = 0;
      const timesString = stu.times ? stu.times[i].join(", ") : "";

      const htmlContent = timesString
        ? `
        <div class="trainer-cell"
            data-email="${stu.email}"
            data-email="${stu.email}"
            data-day="${i}"
            data-name="${stu.name}"
            data-index="${index}"
        >
          <h6>Thời gian rảnh:</h6>
          <p>${timesString}</p>
        </div>
      `
        : "";

      tdInput.innerHTML = htmlContent;

      tr.appendChild(tdInput);
    }

    tbody.appendChild(tr);
  });

  // // Khởi tạo modal của Materialize
  // M.Modal.init(document.querySelectorAll(".modal"));

  // // Lắng nghe sự kiện click vào các phần tử có class student-cell
  // document.querySelectorAll(".trainer-cell").forEach((cell) => {
  //   cell.onclick = function () {
  //     const editScheduleBtn = document.querySelector("#edit-schedule-btn");
  //     editScheduleBtn.innerText = "Edit";

  //     const saveScheduleBtn = document.querySelector("#save-schedule-btn");
  //     saveScheduleBtn.style.visibility = "hidden";

  //     const saveClassesBtn = document.querySelector("#save-classes-btn");
  //     const statusElm = document.querySelector("#status");
  //     const adminNoteElm = document.querySelector("#adminNote");

  //     const name = this.getAttribute("data-name");
  //     const email = this.getAttribute("data-email");
  //     const day = this.getAttribute("data-day");
  //     const index = this.getAttribute("data-index");

  //     document.getElementById("modal-name").innerText = name;
  //     document.getElementById("modal-email").innerText = email;
  //     document.getElementById("modal-time").innerText = dayOfCurrentWeek[day];

  //     statusElm.value = studentData[index].status;
  //     adminNoteElm.value = studentData[index].adminNote;

  //     statusElm.onchange = function () {
  //       studentData[index].status = this.value;
  //     };
  //     adminNoteElm.onchange = function () {
  //       studentData[index].adminNote = this.value;
  //     };

  //     generateSchedule(index, day);

  //     editScheduleBtn.onclick = function () {
  //       if (this.innerText === "Edit") {
  //         generateScheduleEdit(index, day);
  //         saveScheduleBtn.style.visibility = "unset";
  //         this.innerText = "Add";
  //       } else {
  //         addSchedule(index, day);
  //       }
  //     };

  //     saveScheduleBtn.onclick = function () {
  //       saveStudentSchedule(index, day);
  //     };

  //     M.Modal.getInstance(document.getElementById("studentModal")).open();
  //   };
  // });
}
