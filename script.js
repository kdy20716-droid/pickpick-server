document.addEventListener("DOMContentLoaded", () => {
  // 1. Scroll Fade-in Animation (Intersection Observer 활용)
  const fadeElements = document.querySelectorAll(".fade-in");
  const observerOptions = { root: null, rootMargin: "0px", threshold: 0.15 };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target); // 한 번 보이면 관찰 해제
      }
    });
  }, observerOptions);

  fadeElements.forEach((el) => observer.observe(el));

  // 2. Vote Click Interaction
  const voteCards = document.querySelectorAll(".vote-card");

  voteCards.forEach((card) => {
    const options = card.querySelectorAll(".option-box");
    const progressSection = card.querySelector(".progress-section");
    let hasVoted = false;

    options.forEach((option) => {
      option.addEventListener("click", function () {
        if (hasVoted) return; // 중복 투표 방지
        hasVoted = true;

        // 시안용 랜덤 퍼센트 생성 (예: 65% vs 35%)
        const percentA = Math.floor(Math.random() * 41) + 30; // 30 ~ 70 사이
        const percentB = 100 - percentA;

        // 투표 후 Hover Effect (PICK 텍스트 및 어두운 레이어) 비활성화
        options.forEach((opt) => {
          opt.style.pointerEvents = "none";
          const overlay = opt.querySelector(".hover-overlay");
          if (overlay) overlay.style.display = "none";
        });

        // Progress Section 표시 (존재할 경우에만)
        if (progressSection) {
          progressSection.classList.remove("hidden");
        }

        // CSS 애니메이션을 위해 약간의 지연(delay) 후 너비 할당
        setTimeout(() => {
          const fillA = card.querySelector(".fill-a");
          const fillB = card.querySelector(".fill-b");
          const labelA = card.querySelector(".label-a");
          const labelB = card.querySelector(".label-b");

          if (fillA && fillB) {
            fillA.style.width = percentA + "%";
            fillB.style.width = percentB + "%";
          }

          if (labelA && labelB) {
            // 숫자 카운팅 애니메이션 호출
            animateValue(labelA, 0, percentA, 1200);
            animateValue(labelB, 0, percentB, 1200);
          }

          // ★ 투표 결과 확인 후 다음 항목으로 자동 스크롤 (1.5초 뒤)
          setTimeout(() => {
            // 현재 카드의 부모 컨테이너(쇼츠면 .shorts-card, 메인이면 .vote-card) 찾기
            const currentWrapper = card.closest(".shorts-card") || card;
            const nextElement = currentWrapper.nextElementSibling;

            if (nextElement) {
              nextElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }, 1500);
        }, 50);
      });
    });
  });

  // 숫자 카운팅 유틸리티 함수 (ease-out 효과 포함)
  function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      obj.innerHTML = Math.floor(easeProgress * (end - start) + start) + "%";
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }
});
