document.addEventListener("DOMContentLoaded", () => {
  const findPassForm = document.getElementById("findPassForm");
  const emailInput = document.getElementById("emailInput");
  const submitBtn = document.querySelector(".btn-submit");

  findPassForm.addEventListener("submit", (e) => {
    e.preventDefault(); // 페이지 새로고침 방지

    const email = emailInput.value.trim();

    // 1. 간단한 이메일 유효성 검사
    if (!validateEmail(email)) {
      alert("올바른 이메일 형식을 입력해주세요.");
      emailInput.focus();
      return;
    }

    // 2. 버튼 비활성화 (중복 클릭 방지)
    submitBtn.disabled = true;
    submitBtn.textContent = "발송 중...";
    submitBtn.style.opacity = "0.6";

    // 3. 서버 통신 모사 (실제 API 연결 시 이 부분을 수정)
    console.log(`${email}로 임시 비밀번호 발송 요청 중...`);

    setTimeout(() => {
      // 성공 가정 시나리오
      alert(
        `${email}로 임시 비밀번호가 발송되었습니다.\n메일함을 확인해주세요!`,
      );

      // 초기화 및 복구
      submitBtn.disabled = false;
      submitBtn.textContent = "임시 비밀번호 발송";
      submitBtn.style.opacity = "1";
      emailInput.value = "";

      // 성공 후 로그인 페이지 등으로 이동시키고 싶다면:
      // window.location.href = 'login.html';
    }, 2000);
  });

  // 이메일 정규식 검사 함수
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
});
