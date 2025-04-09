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
    td.style = "background: #07bcd0; font-weight: bold; z-index: 1;";
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
            .join("")
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
      const statusElm = document.querySelector("#status");
      const adminNoteElm = document.querySelector("#adminNote");

      const name = this.getAttribute("data-name");
      const email = this.getAttribute("data-email");
      const day = this.getAttribute("data-day");
      const index = this.getAttribute("data-index");

      document.getElementById("modal-name").innerText = name;
      document.getElementById("modal-email").innerText = email;
      document.getElementById("modal-time").innerText = dayOfCurrentWeek[day];

      statusElm.value = studentData[index].status;
      adminNoteElm.value = studentData[index].adminNote;

      statusElm.onchange = function () {
        studentData[index].status = this.value;
      };
      adminNoteElm.onchange = function () {
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
        saveStudentSchedule(index, day);
      };

      saveClassesBtn.onclick = function () {
        saveClasses(index, day);
      };

      generateRegisterClass(index, day);

      const sessionQuantity = document.getElementById("session-quantity");
      sessionQuantity.value = studentData[index].classes[day].length + "";

      sessionQuantity.addEventListener("change", function () {
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

function handleClassesTimeChange(inputEl, index, day, indexTime, position) {
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

  const trainerOptions = trainerData.filter((tr) => {
    return trainerCalendar[tr.name]?.times[day]?.length > 0;
  });

  if (trainerOptions.length === 0) {
    studentData[index].classes = [];
    registerClassContainer.innerHTML =
      "<h6 style='color: red; margin-bottom: 10px;'>Không có trainer rảnh trong ngày này</h6>";
    return;
  }

  studentData[index].classes[day].map((classItem, i) => {
    const [start, end] = classItem.time ? classItem.time.split("-") : ["", ""];
    const settingSession = `
              <div>
                Từ
                <input type="time" style="width: fit-content" step="900" min="08:00" max="23:00" 
                  value="${formatTime(start.trim())}"
                  onchange="handleClassesTimeChange(this, ${index}, ${day}, ${i}, 'pre')"
                />
                đến
                <input type="time" style="width: fit-content" step="900" min="08:00" max="23:00" 
                  value="${formatTime(end.trim())}"
                  onchange="handleClassesTimeChange(this, ${index}, ${day}, ${i}, 'post')"
                />
                <select class="browser-default choose-trainer" onchange="handleClassesTrainerChange(this.value, ${index}, ${day}, ${i})">
                  <option value="" disabled ${
                    classItem.trainer ? "" : "selected"
                  } selected>Chọn Trainer</option>
                  ${trainerOptions
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

function handleScheduleTimeChange(inputEl, index, day, indexTime, position) {
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
          <input type="time" style="width: fit-content" step="900" min="08:00" max="23:00"
            value="${formatTime(start.trim())}"
            onchange="handleScheduleTimeChange(this, ${index}, ${day}, ${i}, 'pre')"
          />
          đến
          <input type="time" style="width: fit-content" step="900" min="08:00" max="23:00"
            value="${formatTime(end.trim())}"
            onchange="handleScheduleTimeChange(this, ${index}, ${day}, ${i}, 'post')"
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
          <input type="time" style="width: fit-content" step="900" min="08:00" max="23:00" 
            onchange="handleScheduleTimeChange(this, ${index}, ${day}, ${
    leisureTime.length - 1
  }, 'pre')"
          
          />
          đến
          <input type="time" style="width: fit-content" step="900" min="08:00" max="23:00" 
            onchange="handleScheduleTimeChange(this, ${index}, ${day}, ${
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

  await Promise.all([
    getAllUser(),
    getStudentCalendar(),
    getTrainerCalendar(),
    getScheduleSheet(),
  ]);

  studentData = studentData.map((s, index) => {
    if (studentCalendar[s.name]) {
      const scheduleCalendar =
        scheduleSheetData.length > 0 && scheduleSheetData[index]
          ? scheduleSheetData[index]
              .slice(-7)
              .map((i) => parseTimeTrainerString(i))
          : Array(7).fill([{ time: "", trainer: "" }]);

      studentCalendar[s.name] = { ...studentCalendar[s.name], ...s };
      return {
        ...s,
        times: studentCalendar[s.name].times.map((day) =>
          day.map((timeRange) => {
            return convertTimeByTimezone(
              timeRange,
              s.timezone,
              userInfo.timezone
            );
          })
        ),
        email: studentCalendar[s.name].email,
        classes: scheduleCalendar,
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
  const schedule = studentData[index].classes?.[day] || [];

  if (schedule.length === 0) {
    M.toast({
      html: "Không có lớp nào được đăng ký!",
      classes: "red",
    });
    return;
  }

  const isInvalid = schedule.some((entry) => {
    if (!entry.time || !entry.trainer) return true;

    const timeRegex = /^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/;
    return !timeRegex.test(entry.time);
  });

  if (isInvalid) {
    M.toast({
      html: "Vui lòng kiểm tra lại thời gian (hh:mm - hh:mm) và trainer!",
      classes: "red",
    });
    return;
  }

  const updatedSchedule = convertStudentData(studentData);
  console.log(" saveClasses ~ updatedSchedule:", updatedSchedule);

  loadingOverlay.style.display = "flex";

  fetch(ADMIN_API_URL, {
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    method: "POST",
    body: JSON.stringify({
      scheduledData: updatedSchedule,
      type: "handle_student_schedule",
      currentEmail: studentData[index].email,
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
  try {
    const timezone = studentData[index].timezone;
    const name = studentData[index].name;
    const email = studentData[index].email;
    const output = convertSchedule(studentData[index].times, timezone);

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
        type: "handle_student_calendar",
        currentEmail: email,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        M.toast({
          html: `Lịch rảnh của ${name} đã được lưu!`,
          classes: "green darken-1",
        });

        document.querySelector("#edit-schedule-btn").innerText = "Edit";
        document.querySelector("#save-schedule-btn").style.visibility =
          "hidden";

        generateTableBody();
        generateSchedule(index, day);
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
    return; // Dừng lại, không gửi request
  }
}

function convertSchedule(inputArray, timezone) {
  const periods = [
    { label: "Sáng (8:00 - 12:00)*", start: 8 * 60, end: 12 * 60 },
    { label: "Chiều (12:00 - 17:00)", start: 12 * 60, end: 17 * 60 },
    { label: "Tối (17:00 - 23:00)", start: 17 * 60, end: 23 * 60 },
  ];

  // Khởi tạo mảng 3 periods, mỗi period có 7 ngày là chuỗi rỗng
  const output = Array.from({ length: 3 }, () =>
    Array.from({ length: 7 }, () => [])
  );

  const timeRegex = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

  inputArray.forEach((dayArray, dayIndex) => {
    if (!Array.isArray(dayArray)) return;

    dayArray.forEach((time) => {
      const timeRange = time
        ? convertTimeByTimezone(time, userInfo.timezone, timezone)
        : "";
      if (!timeRange || typeof timeRange !== "string") {
        throw new Error(
          "Dữ liệu khung giờ không hợp lệ (trống hoặc sai kiểu)."
        );
      }

      const match = timeRange.trim().match(timeRegex);
      if (!match) {
        throw new Error(`Định dạng không hợp lệ: ${timeRange}`);
      }

      const [, sh, sm, eh, em] = match.map(Number);
      const start = sh * 60 + sm;
      const end = eh * 60 + em;

      if (start >= end) {
        throw new Error(`Giờ bắt đầu phải nhỏ hơn giờ kết thúc: ${timeRange}`);
      }

      // Tìm period phù hợp nhất (giao nhau lớn nhất)
      let bestMatch = -1;
      let maxOverlap = -1;

      periods.forEach((period, i) => {
        const overlapStart = Math.max(start, period.start);
        const overlapEnd = Math.min(end, period.end);
        const overlap = Math.max(0, overlapEnd - overlapStart);

        if (overlap > maxOverlap || (overlap === maxOverlap && i > bestMatch)) {
          maxOverlap = overlap;
          bestMatch = i;
        }
      });

      if (bestMatch !== -1) {
        output[bestMatch][dayIndex].push(timeRange);
      }
    });
  });

  // Chuyển mảng thời gian từng ô thành chuỗi
  return output.map((periodRow) =>
    periodRow.map((dayCell) => dayCell.join(", "))
  );
}

function convertStudentData(studentData) {
  return studentData.map((student) => {
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

const getScheduleSheet = async () => {
  await fetch(`${ADMIN_API_URL}?type=get_schedule_sheet`, {
    method: "GET",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then(async (response) => {
      const json = await response.json();
      const { data, success } = JSON.parse(json.message);
      if (success) scheduleSheetData = data;
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu:", error);
    });
};
