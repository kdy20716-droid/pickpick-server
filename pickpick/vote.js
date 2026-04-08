document.addEventListener("DOMContentLoaded", () => {
  // 1. 이미지 업로드 및 미리보기 기능
  const uploadBoxes = document.querySelectorAll(".upload-placeholder");

  uploadBoxes.forEach((box, index) => {
    box.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            // 기존 아이콘 제거 후 이미지 삽입
            box.innerHTML = `<img src="${event.target.result}" style="width:100%; height:100%; object-fit:cover; border-radius:15px;">`;
            // 이미지 선택 시 약간 어둡게 하고 싶다면 클래스 추가 가능
            box.classList.add("has-image");
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });
  });

  // 2. 후보군 이름 실시간 동기화 (에디터 <-> 사이드바)
  const editorNames = document.querySelectorAll(".candidate-name-input");
  const sidebarNames = document.querySelectorAll(".candidate-list input");

  editorNames.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      if (sidebarNames[index]) {
        sidebarNames[index].value = e.target.value;
      }
    });
  });

  sidebarNames.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      if (editorNames[index]) {
        editorNames[index].value = e.target.value;
      }
    });
  });

  // 3. 태그 선택 기능 (최대 2개까지 중복 선택)
  const tags = document.querySelectorAll(".tag");

  tags.forEach((tag) => {
    tag.addEventListener("click", () => {
      // 이미 선택된 태그인 경우 -> 선택 해제
      if (tag.classList.contains("active")) {
        tag.classList.remove("active");
      }
      // 새로 선택하려는 경우
      else {
        // 현재 'active' 클래스를 가진 태그가 몇 개인지 계산
        const activeTags = document.querySelectorAll(".tag.active");

        if (activeTags.length < 2) {
          // 2개 미만일 때만 추가 선택 가능
          tag.classList.add("active");
        } else {
          // 이미 2개를 선택한 상태에서 다른 걸 누르면 알림 (선택 사항)
          alert("태그는 최대 2개까지만 선택할 수 있습니다.");

          /* 기획에 따라 기존 선택 중 하나를 지우고 새것을 선택하게 하려면:
                   activeTags[0].classList.remove('active');
                   tag.classList.add('active');
                */
        }
      }
    });
  });

  // 4. 후보 추가 버튼 (콘솔 로그로 기능 확인)
  const addBtn = document.querySelector(".add-candidate-btn");
  addBtn.addEventListener("click", () => {
    alert("새로운 후보군 입력창이 추가됩니다! (리스트 확장 로직)");
    // 여기에 실제로 DOM을 생성해서 push하는 로직을 추가할 수 있습니다.
  });

  // 5. 최종 제출 버튼
  const submitBtn = document.querySelector(".submit-fab");
  submitBtn.addEventListener("click", () => {
    const title = document.querySelector(".title-input").value;
    if (!title || title === "제목을 입력하세요") {
      alert("투표 제목을 입력해 주세요!");
      return;
    }
    alert("투표가 성공적으로 생성되었습니다!");
  });
});
