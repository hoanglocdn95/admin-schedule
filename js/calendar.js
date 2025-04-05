document.getElementById("admin-timezone").innerText = userInfo.timezone;

function generateHeaders() {
  let today = new Date();
  let dayOfWeek = today.getDay();
  let monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  if (dayOfWeek === 6 || dayOfWeek === 0) monday.setDate(monday.getDate() + 7);

  let sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  let headerRow = document.getElementById("table-header");

  for (let d = new Date(monday); d <= sunday; d.setDate(d.getDate() + 1)) {
    let th = document.createElement("th");

    const dayText = `${
      d.getDay() === 0 ? "Chủ Nhật" : `Thứ ${d.getDay() + 1}`
    } (${d.toLocaleDateString("vi-VN")})`;
    dayOfCurrentWeek.push(dayText);

    th.textContent = dayText;
    th.className = "th-day";

    headerRow.appendChild(th);
  }
}

function generateTableBody() {
  let tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  studentData.forEach((stu, index) => {
    let tr = document.createElement("tr");
    let td = document.createElement("td");

    td.innerHTML = `${stu.name} <br /> ${stu.timezone}`;
    td.style = "background: #07bcd0; font-weight: bold; z-index: 1000;";
    tr.appendChild(td);

    for (let i = 0; i <= 6; i++) {
      let tdInput = document.createElement("td");
      tdInput.style.padding = 0;
      const timesString = stu.times ? stu.times[i].join(", ") : "";
      const classesString = stu.classes
        ? stu.classes[i]
            .map((classItem, i) => {
              return `
          <p>${classItem.time} - ${classItem.trainer}</p>
        `;
            })
            .join(", ")
        : "";

      const htmlContent = timesString
        ? `
        <div class="student-cell"
            data-email="${stu.email}"
            data-email="${stu.email}"
            data-day="${i}"
            data-name="${stu.name}"
            data-index="${index}"
        >
          <h6>Thời gian rảnh:</h6>
          <p>${timesString}</p>
          <hr />
          <h6>Lịch học</h6>
          ${classesString}
        </div>
      `
        : "";

      tdInput.innerHTML = htmlContent;

      tr.appendChild(tdInput);
    }

    tbody.appendChild(tr);
  });

  // Khởi tạo modal của Materialize
  M.Modal.init(document.querySelectorAll(".modal"));

  // Lắng nghe sự kiện click vào các phần tử có class student-cell
  document.querySelectorAll(".student-cell").forEach((cell) => {
    cell.onclick = function () {
      const editScheduleBtn = document.querySelector("#edit-schedule-btn");
      editScheduleBtn.innerText = "Edit";

      const saveScheduleBtn = document.querySelector("#save-schedule-btn");
      saveScheduleBtn.style.visibility = "hidden";

      const saveClassesBtn = document.querySelector("#save-classes-btn");

      const name = this.getAttribute("data-name");
      const email = this.getAttribute("data-email");
      const day = this.getAttribute("data-day");
      const index = this.getAttribute("data-index");

      document.getElementById("modal-name").innerText = name;
      document.getElementById("modal-email").innerText = email;
      document.getElementById("modal-time").innerText = dayOfCurrentWeek[day];

      document.getElementById("status").onchange = function () {
        studentData[index].status = this.value;
      };
      document.getElementById("adminNote").onchange = function () {
        studentData[index].adminNote = this.value;
      };

      generateSchedule(index, day);

      editScheduleBtn.onclick = function () {
        if (this.innerText === "Edit") {
          generateScheduleEdit(index, day);
          saveScheduleBtn.style.visibility = "unset";
          this.innerText = "Add";
        } else {
          addSchedule(index, day);
        }
      };

      saveScheduleBtn.onclick = function () {
        editScheduleBtn.innerText = "Edit";
        saveScheduleBtn.style.visibility = "hidden";
        saveStudentSchedule(index, day);
      };

      saveClassesBtn.onclick = function () {
        saveClasses(index, day);
      };

      document
        .querySelector("#session-quantity")
        .addEventListener("change", function () {
          const currentClasses = studentData[index].classes[day];
          const tmp = Array(+this.value)
            .fill({ time: "", trainer: "" })
            .map((c, i) => {
              if (currentClasses[i]) {
                return { ...currentClasses[i] };
              }
              return c;
            });

          studentData[index].classes[day] = [...tmp];

          generateRegisterClass(index, day);
        });

      M.Modal.getInstance(document.getElementById("studentModal")).open();
    };
  });
}

function handleClassesTimeChange(value, index, day, indexTime, position) {
  const currentValue = studentData[index].classes[day][indexTime].time;
  if (position === "pre") {
    studentData[index].classes[day][indexTime].time = currentValue
      ? `${value}-${currentValue.split("-")[1]}`
      : `${value}-`;
  }
  if (position === "post") {
    studentData[index].classes[day][indexTime].time = currentValue
      ? `${currentValue.split("-")[0]}-${value}`
      : `-${value}`;
  }
}

function handleClassesTrainerChange(value, index, day, indexTime) {
  studentData[index].classes[day][indexTime].trainer = value;
}

function generateRegisterClass(index, day) {
  const registerClassContainer = document.getElementById("register-class");
  registerClassContainer.innerHTML = "";

  studentData[index].classes[day].map((classItem, i) => {
    const [start, end] = classItem.time ? classItem.time.split("-") : ["", ""];
    const settingSession = `
              <div>
                Từ
                <input type="time" style="width: fit-content" 
                  value="${formatTime(start.trim())}"
                  onchange="handleClassesTimeChange(this.value, ${index}, ${day}, ${i}, 'pre')"
                />
                đến
                <input type="time" style="width: fit-content" 
                  value="${formatTime(end.trim())}"
                  onchange="handleClassesTimeChange(this.value, ${index}, ${day}, ${i}, 'post')"
                />
                <select class="browser-default choose-trainer" onchange="handleClassesTrainerChange(this.value, ${index}, ${day}, ${i})">
                  <option value="" disabled ${
                    classItem.trainer ? "" : "selected"
                  } selected>Chọn Trainer</option>
                  ${trainerData
                    .map((tr) => {
                      return `<option value="${tr.name}" ${
                        classItem.trainer === tr.name ? "selected" : ""
                      }>${tr.name}</option>`;
                    })
                    .join("")}
                </select>
              </div>
            `;
    registerClassContainer.innerHTML += settingSession;
  });
}

function deleteTime(index, day, indexTime) {
  const temp = studentData[index].times[day];
  studentData[index].times[day] = temp.filter((_, i) => i !== +indexTime);
  generateScheduleEdit(index, day);
}

function handleScheduleTimeChange(value, index, day, indexTime, position) {
  const currentValue = studentData[index].times[day][indexTime];
  if (position === "pre") {
    studentData[index].times[day][indexTime] = `${value}-${
      currentValue.split("-")[1]
    }`;
  }
  if (position === "post") {
    studentData[index].times[day][indexTime] = `${
      currentValue.split("-")[0]
    }-${value}`;
  }
}

function generateScheduleEdit(index, day) {
  const scheduleContainer = document.getElementById("modal-schedule");
  scheduleContainer.innerHTML = "";

  const leisureTime = studentData[index].times[day].map((t) => t.split(","));

  leisureTime.flat().forEach((time, i) => {
    const [start, end] = time ? time.split("-") : ["", ""];

    const row = document.createElement("div");
    row.innerHTML = `
          <label>Khung giờ ${i + 1}:</label>
          Từ
          <input type="time" style="width: fit-content" 
            value="${formatTime(start.trim())}"
            onchange="handleScheduleTimeChange(this.value, ${index}, ${day}, ${i}, 'pre')"
          />
          đến
          <input type="time" style="width: fit-content" aa='1'  value="${formatTime(
            end.trim()
          )}" 
            onchange="handleScheduleTimeChange(this.value, ${index}, ${day}, ${i}, 'post')"
          />
          <button 
            data-index="${index}"
            data-day="${day}"
            data-timeIndex="${i}"
            onclick="deleteTime(${index}, ${day}, ${i})"
          >Delete</button>
        `;
    scheduleContainer.appendChild(row);
  });
}

function addSchedule(index, day) {
  const scheduleContainer = document.getElementById("modal-schedule");

  const leisureTime = studentData[index].times[day];

  studentData[index].times[day].push("");

  const row = document.createElement("div");
  row.innerHTML = `
          <label>Khung giờ ${leisureTime.length}:</label>
          Từ
          <input type="time" style="width: fit-content" 
            onchange="handleScheduleTimeChange(this.value, ${index}, ${day}, ${
    leisureTime.length - 1
  }, 'pre')"
          
          />
          đến
          <input type="time" style="width: fit-content" 
            onchange="handleScheduleTimeChange(this.value, ${index}, ${day}, ${
    leisureTime.length - 1
  }, 'post')"
          />
          <button 
            data-index="${index}"
            data-day="${day}"
            data-timeIndex="${leisureTime.length - 1}"
            onclick="deleteTime(${index}, ${day}, ${leisureTime.length - 1})"
          >Delete</button>
        `;
  scheduleContainer.appendChild(row);
}

document.addEventListener("DOMContentLoaded", async function () {
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "flex";

  await Promise.all([getAllUser(), getStudentCalendar(), getTrainerCalendar()]);

  studentData = studentData.map((s) => {
    if (studentCalendar[s.name]) {
      studentCalendar[s.name] = { ...studentCalendar[s.name], ...s };
      return {
        ...s,
        times: studentCalendar[s.name].times.map((day) =>
          day.map((timeRange) =>
            convertTimeByTimezone(timeRange, s.timezone, userInfo.timezone)
          )
        ),
        email: studentCalendar[s.name].email,
        classes: Array(7).fill([{ time: "", trainer: "" }]),
        status: "",
        adminNote: "",
      };
    }
    return s;
  });

  generateHeaders();
  generateTableBody();

  loadingOverlay.style.display = "none";
});

const closeModal = () => {
  M.Modal.getInstance(document.getElementById("studentModal")).close();
};

const saveClasses = (index, day) => {
  // const timezone = studentData[index].timezone;
  // const name = studentData[index].name;
  // const email = studentData[index].email;
  // const output = convertSchedule(studentData[index].times);

  const updatedSchedule = convertStudentData(studentData);

  loadingOverlay.style.display = "flex";

  fetch(ADMIN_API_URL, {
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    method: "POST",
    body: JSON.stringify({
      scheduledData: updatedSchedule,
      type: "handle_student_schedule",
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      M.toast({ html: "Dữ liệu đã được lưu!", classes: "green darken-1" });
      setTimeout(() => {
        generateTableBody();
      }, 1000);
    })
    .catch((error) => {
      console.error("error:", error);
    })
    .finally(() => {
      loadingOverlay.style.display = "none";
    });
};

function saveStudentSchedule(index, day) {
  const isTrainer = false;
  const timezone = studentData[index].timezone;
  const name = studentData[index].name;
  const email = studentData[index].email;
  const output = convertSchedule(studentData[index].times);

  const updatedSchedule = addUserInfoToSchedule(output, email, name, timezone);

  loadingOverlay.style.display = "flex";

  fetch(SCHEDULE_API_URL, {
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    method: "POST",
    body: JSON.stringify({
      scheduledData: updatedSchedule,
      timezone,
      type: isTrainer ? "handle_trainer_calendar" : "handle_student_calendar",
      currentEmail: email,
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      M.toast({
        html: `Lịch rảnh của ${name} đã được lưu!`,
        classes: "green darken-1",
      });
      generateTableBody();

      generateSchedule(index, day);
    })
    .catch((error) => {
      console.error("error:", error);
    })
    .finally(() => {
      loadingOverlay.style.display = "none";
    });
}

function convertSchedule(inputArray) {
  let periods = [
    { label: "Sáng (8:00 - 12:00)*", start: 8, end: 12 },
    { label: "Chiều (12:00 - 17:00)", start: 12, end: 17 },
    { label: "Tối (17:00 - 23:00)", start: 17, end: 23 },
  ];

  // Tạo output với 3 phần tử (Sáng, Chiều, Tối), mỗi phần tử có 7 chuỗi tương ứng 7 ngày
  let output = Array.from({ length: 3 }, () => Array(7).fill(""));

  // Duyệt từng ngày trong tuần
  inputArray.forEach((dayArray, dayIndex) => {
    // Duyệt từng khoảng thời gian trong ngày đó
    dayArray.forEach((timeRange) => {
      let match = timeRange.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
      if (match) {
        let startHour = parseInt(match[1], 10);
        let endHour = parseInt(match[3], 10);

        // Phân loại vào các khoảng sáng, chiều, tối
        periods.forEach((period, periodIndex) => {
          if (
            (startHour < period.end && endHour > period.start) || // Trường hợp giao nhau
            (startHour >= period.start && endHour <= period.end) // Trường hợp nằm trọn
          ) {
            if (output[periodIndex][dayIndex]) {
              output[periodIndex][dayIndex] += ", " + timeRange;
            } else {
              output[periodIndex][dayIndex] = timeRange;
            }
          }
        });
      }
    });
  });

  return output;
}

function convertStudentData(studentData) {
  return studentData.map((student) => {
    console.log(" returnstudentData.map ~ student:", student);
    const formattedClasses = student.classes
      ? student.classes.map((dayClasses) => {
          return dayClasses
            .map((c) =>
              c.time && c.trainer
                ? `${convertTimeByTimezone(
                    c.time,
                    userInfo.timezone,
                    student.timezone
                  )} (${c.trainer})`
                : ""
            )
            .filter((i) => i)
            .join("\n");
        })
      : Array(7).fill("");

    return [
      student.name || "",
      student.timezone || "",
      student.email || "",
      student.facebook || "",
      `${student.pteClass} - ${student.name} (Class)`,
      student.status,
      student.adminNote,
      ...formattedClasses,
    ];
  });
}
