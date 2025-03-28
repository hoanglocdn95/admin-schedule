const SCHEDULE_API_URL =
  "https://script.google.com/macros/s/AKfycbzPRg-axjCT4R-6tDV5N9PcJ3VIiHk0EOKobk9Pbj4qgayIDkWrFautirWm7dJo3ejpkA/exec";

const ACCOUNT_API_URL =
  "https://script.google.com/macros/s/AKfycbytD-SM2ZqlC_8ZealODSCynhWbauexL3JENPDczagcC_B5zcz2Epn8cOqxbQQ3w-Zijw/exec";

const REMAIN_TIME_TO_EDIT = 5;

let studentData = [];
let trainerData = [];

let studentCalendar = {};

const dayOfCurrentWeek = [];

let currentScheduledData = Array.from({ length: 3 }, () => Array(7).fill(""));

const useInfo = JSON.parse(sessionStorage.getItem("user_info"));

function parseSchedule(allData) {
  const result = {};

  allData.forEach((dayData, sessionIndex) => {
    dayData.forEach((entry, dayIndex) => {
      if (!entry) return; // Bỏ qua nếu entry rỗng

      const lines = entry.split("\n"); // Mỗi entry có thể có nhiều dòng
      lines.forEach((line) => {
        const match = line.match(
          /^(.+?) - \(GMT [^)]*\) [^-]+- ([^ ]+) \((.+)\)$/
        );
        if (match) {
          const name = match[1].trim();
          const email = match[2].trim();
          const time = match[3].trim();

          if (!result[name]) {
            result[name] = {
              email,
              times: Array(7)
                .fill(null)
                .map(() => []),
            };
          }

          result[name].times[dayIndex].push(time);
        }
      });
    });
  });

  return result;
}

document.addEventListener("DOMContentLoaded", function () {
  if (!sessionStorage.getItem("user_email")) {
    window.location.href = "index.html";
  }
  if (!sessionStorage.getItem("user_info")) {
    window.location.href = "admin.html";
  }
});

function logout() {
  sessionStorage.clear();
  window.location.href = "index.html";
}

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
  // let periods = [
  //   { label: "Sáng (8:00 - 12:00)*", start: 8, end: 12 },
  //   { label: "Chiều (12:00 - 17:00)", start: 12, end: 17 },
  //   { label: "Tối (17:00 - 23:00)", start: 17, end: 23 },
  // ];

  studentData = studentData.map((s) => {
    if (studentCalendar[s.name]) {
      studentCalendar[s.name] = { ...studentCalendar[s.name], ...s };
      return {
        ...s,
        times: studentCalendar[s.name].times,
        email: studentCalendar[s.name].email,
      };
    }
    return s;
  });
  console.log(" initTableData ~ studentCalendar:", {
    studentCalendar,
    studentData,
  });

  studentData.forEach((stu, index) => {
    let tr = document.createElement("tr");
    let td = document.createElement("td");

    td.textContent = stu.name;
    td.style = "background: #07bcd0; font-weight: bold;";
    tr.appendChild(td);

    for (let i = 0; i <= 6; i++) {
      let tdInput = document.createElement("td");
      tdInput.style.padding = 0;
      const timesString = stu.times ? stu.times[i].join(", ") : "";
      // console.log(" studentData.forEach ~ stu:", stu);
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
          <p>---</p>
        </div>
      `
        : "";

      tdInput.innerHTML = htmlContent;

      tr.appendChild(tdInput);
    }

    tbody.appendChild(tr);
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  const loadingOverlay = document.getElementById("loadingOverlay");
  loadingOverlay.style.display = "flex";
  await Promise.all([getAllUser(), initTableData()]);

  generateHeaders();
  generateTableBody();

  // Khởi tạo modal của Materialize
  M.Modal.init(document.querySelectorAll(".modal"));

  // Lắng nghe sự kiện click vào các phần tử có class student-cell
  document.querySelectorAll(".student-cell").forEach((cell) => {
    cell.addEventListener("click", function () {
      const name = this.getAttribute("data-name");
      const email = this.getAttribute("data-email");
      const day = this.getAttribute("data-day");
      const index = this.getAttribute("data-index");

      document.getElementById("modal-name").innerText = name;
      document.getElementById("modal-email").innerText = email;
      document.getElementById("modal-time").innerText = dayOfCurrentWeek[day];

      // Xóa lịch học cũ
      const scheduleContainer = document.getElementById("modal-schedule");
      scheduleContainer.innerHTML = "";

      // Thêm input thời gian
      studentData[index].times[day].forEach((time, index) => {
        time.split(",").forEach((t) => {
          const [start, end] = t.split("-");

          const row = document.createElement("div");
          row.innerHTML = `
            <label>Khung giờ ${index + 1}:</label>
            <p>Từ <b>${start.trim()}</b> đến <b>${end.trim()}</b></p>
          `;
          scheduleContainer.appendChild(row);
        });
      });

      const selectHTML = document.getElementById("modal-trainer");
      selectHTML.innerHTML =
        ' <option value="" disabled selected>Chọn Trainer</option>';
      trainerData.map((tr, index) => {
        console.log(" trainerData.map ~ tr:", tr);
        const option = document.createElement("option");
        option.value = tr.name;
        option.innerText = tr.name;
        selectHTML.appendChild(option);
      });

      M.Modal.getInstance(document.getElementById("studentModal")).open();
    });
  });

  loadingOverlay.style.display = "none";
});

function submitSchedule() {
  const tableData = [];
  document.querySelectorAll("tbody tr").forEach((row) => {
    const rowData = [];
    row.querySelectorAll("textarea").forEach((textarea) => {
      rowData.push(textarea.value.trim());
    });
    tableData.push(rowData);
  });

  sessionStorage.setItem("scheduleData", JSON.stringify(tableData));
  window.location.href = "confirm.html";
}

async function initTableData() {
  // const scheduleData = JSON.parse(sessionStorage.getItem("scheduleData"));

  try {
    let response = await fetch(`${SCHEDULE_API_URL}?type=get_calendar`, {
      redirect: "follow",
      method: "GET",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });

    const res = await response.json();
    studentCalendar = parseSchedule(res.data);
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
  }
}

async function getAllUser() {
  try {
    const response = await fetch(`${ACCOUNT_API_URL}?type=get_all_user`, {
      method: "GET",
      redirect: "follow",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const data = await response.json();
    if (data.success) {
      if (data.student) studentData = data.student;
      if (data.trainer) trainerData = data.trainer;
    }
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu:", error);
  } finally {
  }
}
