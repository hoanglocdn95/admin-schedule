document.getElementById("admin-timezone").innerText = userInfo.timezone;
document.getElementById("admin-name").innerText = userInfo.name;

function generateTableBody() {
  let tbody = document.getElementById("table-body");
  tbody.innerHTML = "";

  studentData.forEach((stu, index) => {
    let tr = document.createElement("tr");

    // --- Cột 1: Tên + timezone
    const nameTd = document.createElement("td");
    nameTd.innerHTML = `${shortenName(stu.name)} - ${extractCityName(
      stu.timezone
    )}`;
    nameTd.style = `background: #07bcd0;
      font-weight: bold;
      z-index: 1; 
      max-width: 200px;
      `;
    tr.appendChild(nameTd);

    // --- Cột 2: Status
    const statusTd = document.createElement("td");

    statusTd.innerHTML = `
      <div id='status-${index}'>
        <select 
          id="status-${index}" 
          class="browser-default status-select" 
          onchange="changeStatus(this, ${index})"
        >
          <option value="Chờ lịch rảnh" 
            ${stu.status === "Chờ lịch rảnh" ? "selected" : ""}
         >Chờ lịch rảnh</option>
          <option value="Chờ xác nhận lịch học" 
            ${stu.status === "Chờ xác nhận lịch học" ? "selected" : ""}
          >Chờ xác nhận lịch học</option>
          <option value="Đã gửi link zoom" ${
            stu.status === "Đã gửi link zoom" ? "selected" : ""
          } >Đã gửi link zoom</option>
        </select>
      </div>
    `;

    tr.appendChild(statusTd);

    // --- Cột 3: Admin Note (view-only + button chỉnh sửa)
    const noteTd = document.createElement("td");
    noteTd.innerHTML = `
      <div id='adminNote-${index}'>
        <p class='adminNote-value' id='adminNote-value-${index}' onclick='editAdminNote(${index})' 
        ${stu.adminNote ? "" : "style='color: #ffffff'"}
        >${stu.adminNote || "click vào để edit"}</p>
       
      </div>
      <div id='adminNote-edit-${index}' style='display: none;'>
        <textarea id='adminNote-input-${index}' data-index="${index}">${
      stu.adminNote || ""
    }</textarea>
        <hr />
        <button onclick="saveAdminNote(${index})">Save</button>
        <button onclick="cancelAdminNote(${index})">Cancel</button>
      </div>`;
    tr.appendChild(noteTd);

    // --- Cột 4~10: các ngày trong tuần
    for (let i = 0; i <= 6; i++) {
      const tdInput = document.createElement("td");
      tdInput.style.padding = 0;

      const timesString = stu.times?.[i]?.join(", ") || "";
      const classesString =
        stu.classes?.[i]
          ?.map(
            (classItem) => `
            <p style="background-color: ${
              classItem.color
            }; color: white; padding: 2px; border-radius: 5px;">
              ${classItem.time} - ${shortenName(classItem.trainerName)}
            </p>`
          )
          .join("") || "";

      const htmlContent = `
        <div class="student-cell"
            data-email="${stu.email}"
            data-day="${i}"
            data-name="${stu.name}"
            data-index="${index}"
        >
        ${
          classesString
            ? classesString
            : `<p>${timesString ? timesString : "---"}</p>`
        }
        </div>`;

      tdInput.innerHTML = htmlContent;
      tr.appendChild(tdInput);
    }

    tbody.appendChild(tr);
  });

  // Khởi tạo modal + sự kiện click
  M.Modal.init(document.querySelectorAll(".modal"));

  document.querySelectorAll(".student-cell").forEach((cell) => {
    cell.onclick = function () {
      const editScheduleBtn = document.querySelector("#edit-schedule-btn");
      editScheduleBtn.innerText = "Edit";
      const saveScheduleBtn = document.querySelector("#save-schedule-btn");
      saveScheduleBtn.style.visibility = "hidden";

      const name = this.dataset.name;
      const email = this.dataset.email;
      const day = this.dataset.day;
      const index = +this.dataset.index;

      document.getElementById("modal-name").innerText = name;
      document.getElementById("modal-email").innerText = email;
      document.getElementById("modal-time").innerText =
        dayOfCurrentWeek[day] || "";

      generateSchedule(index, day);
      generateRegisterClass(index, day);

      editScheduleBtn.onclick = () => {
        if (editScheduleBtn.innerText === "Edit") {
          generateScheduleEdit(index, day);
          saveScheduleBtn.style.visibility = "unset";
          editScheduleBtn.innerText = "Add";
        } else {
          addSchedule(index, day);
        }
      };

      saveScheduleBtn.onclick = () => saveStudentSchedule(index, day);
      document.querySelector("#save-classes-btn").onclick = () =>
        saveClasses(index, day);

      const sessionQuantity = document.querySelector(".session-quantity");
      sessionQuantity.value =
        studentData[index].classes?.[day]?.length?.toString() || "0";

      sessionQuantity.onchange = function () {
        const currentClasses = studentData[index].classes?.[day] || [];
        const count = +this.value;

        studentData[index].classes[day] = Array(count)
          .fill(null)
          .map((_, i) =>
            currentClasses[i]
              ? { ...currentClasses[i] }
              : { time: "", trainerName: "", color: "", trainerEmail: "" }
          );

        generateRegisterClass(index, day);
      };

      M.Modal.getInstance(document.getElementById("studentModal")).open();
    };
  });
}

function changeStatus(elm, index) {
  const statusElm = document.querySelector(`#status-${index}`);
  studentData[index].status = elm.value;

  const updatedSchedule = convertStudentData(studentData);

  loadingOverlay.style.display = "flex";

  fetch(ADMIN_API_URL, {
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    method: "POST",
    body: JSON.stringify({
      scheduledData: updatedSchedule,
      type: "handle_student_schedule",
      currentEmail: studentData[index].email,
      indexRow: index,
      sheetName: getSheetNames(SHEET_TYPE.SCHEDULE),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      M.toast({
        html: "Trạng thái đã được cập nhật!",
        classes: "green darken-1",
      });
    })
    .catch((error) => {
      console.error("error:", error);
      M.toast({
        html: "Lỗi 414: Không thể cập nhật trạng thái!",
        classes: "red",
      });
      statusElm.value = "";
    })
    .finally(() => {
      loadingOverlay.style.display = "none";
    });
}

function saveAdminNote(index) {
  const inputAdminNoteElm = document.querySelector(`#adminNote-input-${index}`);

  studentData[index].adminNote = inputAdminNoteElm.value;

  const updatedSchedule = convertStudentData(studentData);

  loadingOverlay.style.display = "flex";

  fetch(ADMIN_API_URL, {
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    method: "POST",
    body: JSON.stringify({
      scheduledData: updatedSchedule,
      type: "handle_student_schedule",
      currentEmail: studentData[index].email,
      indexRow: index,
      sheetName: getSheetNames(SHEET_TYPE.SCHEDULE),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      M.toast({ html: "Chú thích đã được lưu!", classes: "green darken-1" });
      setTimeout(() => {
        const valueAdminNoteElm = document.querySelector(
          `#adminNote-value-${index}`
        );
        valueAdminNoteElm.innerText = inputAdminNoteElm.value;
        cancelAdminNote(index);
      }, 1000);
    })
    .catch((error) => {
      console.error("error:", error);
    })
    .finally(() => {
      loadingOverlay.style.display = "none";
    });
}

function editAdminNote(index) {
  const adminNoteElm = document.querySelector(`#adminNote-${index}`);
  const adminNoteEditElm = document.querySelector(`#adminNote-edit-${index}`);
  adminNoteElm.style.display = "none";
  adminNoteEditElm.style.display = "block";
}

function cancelAdminNote(index) {
  const adminNoteElm = document.querySelector(`#adminNote-${index}`);
  const adminNoteEditElm = document.querySelector(`#adminNote-edit-${index}`);
  adminNoteElm.style.display = "block";
  adminNoteEditElm.style.display = "none";
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
  const trainer = trainerData.filter((tr) => tr.email === value);

  studentData[index].classes[day][indexTime].trainerEmail = value;
  studentData[index].classes[day][indexTime].trainerName = trainer[0].name;
  studentData[index].classes[day][indexTime].color =
    trainer[0].color || "#000000";
}

function generateRegisterClass(index, day) {
  const registerClassContainer = document.getElementById("register-class");
  registerClassContainer.innerHTML = "";

  const trainerOptions = trainerData.filter((tr) => {
    return trainerCalendar[tr.email]?.times[day]?.length > 0;
  });

  if (trainerOptions.length === 0) {
    studentData[index].classes = [];
    registerClassContainer.innerHTML =
      "<h6 style='color: red; margin-bottom: 10px;'>Không có trainer rảnh trong ngày này</h6>";
    return;
  }

  if (!studentData[index].classes) return;

  studentData[index].classes[day].map((classItem, i) => {
    const [start, end] = classItem.time ? classItem.time.split("-") : ["", ""];
    const settingSession = `
              <div>
                Từ
                <input type="time" style="width: fit-content" step="900" min="07:00" max="24:00" 
                  value="${formatTime(start.trim())}"
                  onchange="handleClassesTimeChange(this, ${index}, ${day}, ${i}, 'pre')"
                />
                đến
                <input type="time" style="width: fit-content" step="900" min="07:00" max="24:00" 
                  value="${formatTime(end.trim())}"
                  onchange="handleClassesTimeChange(this, ${index}, ${day}, ${i}, 'post')"
                />
                <select class="browser-default choose-trainer" onchange="handleClassesTrainerChange(this.value, ${index}, ${day}, ${i})">
                  <option value="" disabled ${
                    classItem.trainerEmail ? "" : "selected"
                  } selected>Chọn Trainer</option>
                  ${trainerOptions
                    .map((tr) => {
                      return `<option value="${tr.email}" ${
                        classItem.trainerEmail === tr.email ? "selected" : ""
                      } style="background-color: ${tr.color}">${
                        tr.name
                      }</option>`;
                    })
                    .join("")}
                </select>
                <button 
                  data-index="${index}"
                  data-day="${day}"
                  data-classIndex="${i}"
                  onclick="deleteClass(${index}, ${day}, ${i})"
                >Delete</button>
              </div>
            `;
    registerClassContainer.innerHTML += settingSession;
  });
}

function deleteClass(index, day, indexClass) {
  const temp = studentData[index].classes[day];
  const classesTmp = temp.filter((_, i) => i !== +indexClass);
  studentData[index].classes[day] = classesTmp;
  const sessionQuantity = document.querySelector(".session-quantity");
  sessionQuantity.value = classesTmp.length + "";
  generateRegisterClass(index, day);
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

  if (!studentData[index].times) return;

  const leisureTime = studentData[index].times[day].map((t) => t.split(","));

  leisureTime.flat().forEach((time, i) => {
    const [start, end] = time ? time.split("-") : ["", ""];

    const row = document.createElement("div");
    row.innerHTML = `
          <label>Khung giờ ${i + 1}:</label>
          Từ
          <input type="time" style="width: fit-content" step="900" min="07:00" min="24:00"
            value="${formatTime(start.trim())}"
            onchange="handleScheduleTimeChange(this, ${index}, ${day}, ${i}, 'pre')"
          />
          đến
          <input type="time" style="width: fit-content" step="900" min="07:00" min="24:00"
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

  if (!studentData[index].times) return;

  const leisureTime = studentData[index].times[day];

  studentData[index].times[day].push("");

  const row = document.createElement("div");
  row.innerHTML = `
          <label>Khung giờ ${leisureTime.length}:</label>
          Từ
          <input type="time" style="width: fit-content" step="900" min="07:00" min="24:00" 
            onchange="handleScheduleTimeChange(this, ${index}, ${day}, ${
    leisureTime.length - 1
  }, 'pre')"
          
          />
          đến
          <input type="time" style="width: fit-content" step="900" min="07:00" min="24:00" 
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

const initCalendar = async () => {
  loadingOverlay.style.display = "flex";

  await Promise.all([
    getAllUser(),
    getCalendarByType(SHEET_TYPE.STUDENT),
    getCalendarByType(SHEET_TYPE.TRAINER),
    getScheduleBySheetName(),
  ]);

  handleStudentData();
  handleTrainerData();

  generateStudentHeaders();
  generateTrainerHeaders();

  generateTableBody();

  generateTrainerTableBody();

  loadingOverlay.style.display = "none";
};

document.addEventListener("DOMContentLoaded", function () {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  document.getElementById("dateInput").value = `${yyyy}-${mm}-${dd}`;
  showWeekRange();
});

const closeModal = () => {
  M.Modal.getInstance(document.getElementById("studentModal")).close();
};

const saveClasses = (index, day) => {
  const schedule = studentData[index].classes?.[day] || [];

  if (studentData[index].times[day].length === 0) {
    M.toast({
      html: "Học viên cần đăng ký giờ rảnh trước khi được xếp lịch học!",
      classes: "red",
    });
    return;
  }

  const isInvalid = schedule.some((entry) => {
    if (!entry.time || !entry.trainerEmail) return true;

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

  loadingOverlay.style.display = "flex";

  fetch(ADMIN_API_URL, {
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    method: "POST",
    body: JSON.stringify({
      scheduledData: updatedSchedule,
      type: "handle_student_schedule",
      currentEmail: studentData[index].email,
      indexRow: index,
      sheetName: getSheetNames(SHEET_TYPE.SCHEDULE),
    }),
  })
    .then((response) => response.json())
    .then((data) => {
      M.toast({ html: "Dữ liệu đã được lưu!", classes: "green darken-1" });
      setTimeout(() => {
        closeModal();
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
        sheetName: getSheetNames(SHEET_TYPE.STUDENT),
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
        closeModal();

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

function convertSchedule(inputArray, targetTimezone) {
  const periods = [
    { label: "Sáng (7:00 - 12:00)*", start: 7 * 60, end: 12 * 60 },
    { label: "Chiều (12:00 - 17:00)", start: 12 * 60, end: 17 * 60 },
    { label: "Tối (17:00 - 24:00)", start: 17 * 60, end: 24 * 60 },
  ];

  // Khởi tạo mảng output
  const output = Array.from({ length: 3 }, () =>
    Array.from({ length: 7 }, () => [])
  );

  const userOffset = getOffset(userInfo.timezone);
  const targetOffset = getOffset(targetTimezone);
  const offsetMinutes = targetOffset - userOffset;

  const timeRegex = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

  inputArray.forEach((dayArray, dayIndex) => {
    if (!Array.isArray(dayArray)) return;

    dayArray.forEach((time) => {
      if (!time || typeof time !== "string") return;

      const match = time.trim().match(timeRegex);
      if (!match) {
        throw new Error(`Định dạng không hợp lệ: ${time}`);
      }

      const [, sh, sm, eh, em] = match.map(Number);
      let start = sh * 60 + sm + offsetMinutes;
      let end = eh * 60 + em + offsetMinutes;

      // Normalize time range: nếu end <= start → qua ngày hôm sau → +24h
      if (end <= start) end += 24 * 60;

      // Tìm period có overlap lớn nhất
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
        output[bestMatch][dayIndex].push(
          convertTimeByTimezone(time, userInfo.timezone, targetTimezone)
        );
      }
    });
  });

  // Trả về mảng output dạng string
  return output.map((periodRow) =>
    periodRow.map((dayCell) => dayCell.join(", "))
  );
}

function convertStudentData(studentData) {
  return studentData.map((student) => {
    const formattedClasses = student.classes
      ? student.classes.map((dayClasses) => {
          return dayClasses
            .map((c) => {
              return c.time && c.trainerEmail
                ? `${convertTimeByTimezone(
                    c.time,
                    userInfo.timezone,
                    student.timezone
                  )} (${c.trainerName}-${c.trainerEmail})#${c.color}#`
                : "";
            })
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
      student.status || "",
      student.adminNote || "",
      ...formattedClasses,
    ];
  });
}

const getScheduleBySheetName = async () => {
  const sName = getSheetNames(SHEET_TYPE.SCHEDULE);
  await fetch(`${ADMIN_API_URL}?type=get_schedule_by_name&sheetName=${sName}`, {
    method: "GET",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then(async (response) => {
      const json = await response.json();
      const { data, success, message } = JSON.parse(json.message);
      if (success) scheduleSheetData = data;
      else {
        M.toast({ html: message, classes: "blue darken-1" });
      }
    })
    .catch((error) => {
      console.error("Lỗi khi lấy dữ liệu:", error);
    });
};
