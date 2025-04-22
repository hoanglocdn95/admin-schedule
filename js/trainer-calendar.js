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

function closeTrainerModal() {
  M.Modal.getInstance(document.getElementById("trainerModal")).close();
}

function generateTrainerSchedule(index, day) {
  const scheduleContainer = document.getElementById("trainer-modal-schedule");
  scheduleContainer.innerHTML = "";

  const leisureTime = trainerData[index].times[day];

  leisureTime.flat().forEach((time, i) => {
    const [start, end] = time.split("-");

    const row = document.createElement("div");
    row.innerHTML = `
          <label>Khung giờ ${i + 1}:</label>
          <p>Từ <b>${start}</b> đến <b>${end}</b></p>
        `;
    scheduleContainer.appendChild(row);
  });
}

function deleteTrainerTime(index, day, indexTime) {
  const temp = trainerData[index].times[day];
  trainerData[index].times[day] = temp.filter((_, i) => i !== +indexTime);
  generateTrainerScheduleEdit(index, day);
}

function handleTrainerScheduleTimeChange(
  inputEl,
  index,
  day,
  indexTime,
  position
) {
  let value = inputEl.value;
  const [hour, minute] = value.split(":").map(Number);

  let roundedMinute = Math.round(minute / 15) * 15;
  let adjustedHour = hour;

  if (roundedMinute === 60) {
    roundedMinute = 0;
    adjustedHour += 1;
  }

  if (minute % 15 !== 0) {
    M.toast({
      html: "Chỉ được chọn số phút là bội số của 15",
      classes: "red",
    });

    const formattedTime = `${String(adjustedHour).padStart(2, "0")}:${String(
      roundedMinute
    ).padStart(2, "0")}`;
    inputEl.value = formattedTime;
    value = formattedTime;
  }

  const currentValue = trainerData[index].times[day][indexTime];
  if (position === "pre") {
    trainerData[index].times[day][indexTime] = `${value}-${
      currentValue.split("-")[1]
    }`;
  }
  if (position === "post") {
    trainerData[index].times[day][indexTime] = `${
      currentValue.split("-")[0]
    }-${value}`;
  }
}

function generateTrainerScheduleEdit(index, day) {
  const scheduleContainer = document.getElementById("trainer-modal-schedule");
  scheduleContainer.innerHTML = "";

  const leisureTime = trainerData[index].times[day].map((t) => t.split(","));

  leisureTime.flat().forEach((time, i) => {
    const [start, end] = time ? time.split("-") : ["", ""];

    const row = document.createElement("div");
    row.innerHTML = `
          <label>Khung giờ ${i + 1}:</label>
          Từ
          <input type="time" style="width: fit-content"
            value="${formatTime(start.trim())}"
            onchange="handleTrainerScheduleTimeChange(this, ${index}, ${day}, ${i}, 'pre')"
          />
          đến
          <input type="time" style="width: fit-content"
            value="${formatTime(end.trim())}"
            onchange="handleTrainerScheduleTimeChange(this, ${index}, ${day}, ${i}, 'post')"
          />
          <button
            data-index="${index}"
            data-day="${day}"
            data-timeIndex="${i}"
            onclick="deleteTrainerTime(${index}, ${day}, ${i})"
          >Delete</button>
        `;
    scheduleContainer.appendChild(row);
  });
}

function generateTrainerTableBody() {
  let tbody = document.getElementById("trainer-table-body");
  tbody.innerHTML = "";

  trainerData.forEach((tra, index) => {
    let tr = document.createElement("tr");
    let td = document.createElement("td");

    td.innerHTML = `${tra.name} <br /> ${tra.timezone}`;
    td.style = "background: #07bcd0; font-weight: bold; z-index: 1;";
    tr.appendChild(td);

    for (let i = 0; i <= 6; i++) {
      let tdInput = document.createElement("td");
      tdInput.style.padding = 0;
      const timesString = tra.times ? tra.times[i].join(", ") : "";

      const htmlContent = timesString
        ? `
        <div class="trainer-cell"
            data-email="${tra.email}"
            data-day="${i}"
            data-name="${tra.name}"
            data-index="${index}"
        >
          <h6>Thời gian rảnh:</h6>
          <p>${timesString}</p>
        </div>
      `
        : `
        <div class="trainer-cell"
            data-email="${tra.email}"
            data-day="${i}"
            data-name="${tra.name}"
            data-index="${index}"
        >
          <p>---</p>
        </div>
      `;

      tdInput.innerHTML = htmlContent;

      tr.appendChild(tdInput);
    }

    tbody.appendChild(tr);
  });

  // Khởi tạo modal của Materialize
  M.Modal.init(document.querySelector("#trainerModal"));

  // Lắng nghe sự kiện click vào các phần tử có class student-cell
  document.querySelectorAll(".trainer-cell").forEach((cell) => {
    cell.onclick = function () {
      const editScheduleBtn = document.querySelector("#edit-trainer-schedule");
      editScheduleBtn.innerText = "Edit";

      const saveScheduleBtn = document.querySelector("#save-trainer-schedule");
      saveScheduleBtn.style.visibility = "hidden";

      const name = this.getAttribute("data-name");
      const email = this.getAttribute("data-email");
      const day = this.getAttribute("data-day");
      const index = this.getAttribute("data-index");

      document.getElementById("trainer-modal-name").innerText = name;
      document.getElementById("trainer-modal-email").innerText = email;
      document.getElementById("trainer-modal-time").innerText =
        dayOfCurrentWeek[day];

      generateTrainerSchedule(index, day);

      editScheduleBtn.onclick = function () {
        if (this.innerText === "Edit") {
          generateTrainerScheduleEdit(index, day);
          saveScheduleBtn.style.visibility = "unset";
          this.innerText = "Add";
        } else {
          addSchedule(index, day);
        }
      };

      saveScheduleBtn.onclick = function () {
        saveTrainerSchedule(index, day);
      };

      M.Modal.getInstance(document.getElementById("trainerModal")).open();
    };
  });
}

function saveTrainerSchedule(index, day) {
  try {
    const timezone = trainerData[index].timezone;
    const name = trainerData[index].name;
    const email = trainerData[index].email;
    const output = convertSchedule(trainerData[index].times, timezone);

    const updatedSchedule = addUserInfoToSchedule(
      output,
      email,
      name,
      timezone
    );

    loadingOverlay.style.display = "flex";

    fetch(SCHEDULE_API_URL, {
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      method: "POST",
      body: JSON.stringify({
        scheduledData: updatedSchedule,
        timezone,
        type: "handle_trainer_calendar",
        currentEmail: email,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        M.toast({
          html: `Lịch rảnh của ${name} đã được lưu!`,
          classes: "green darken-1",
        });

        document.querySelector("#edit-trainer-schedule").innerText = "Edit";
        document.querySelector("#save-trainer-schedule").style.visibility =
          "hidden";
        closeTrainerModal();

        generateTrainerTableBody();
        generateTrainerSchedule(index, day);
      })
      .catch((error) => {
        console.error("error:", error);
        M.toast({
          html: "Lưu không thành công!",
          classes: "red",
        });
      })
      .finally(() => {
        loadingOverlay.style.display = "none";
      });
  } catch (err) {
    loadingOverlay.style.display = "none";
    M.toast({
      html: err.message,
      classes: "red",
    });
    return;
  }
}
