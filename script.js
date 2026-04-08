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

        // 부모 options-wrapper에 voted 클래스 추가
        const wrapper = option.closest(".options-wrapper");
        if (wrapper) {
          wrapper.classList.add("voted");
        }

        // 투표 후 Hover Effect 비활성화 및 선택 여부에 따른 클래스 부여
        options.forEach((opt) => {
          if (opt === option) {
            opt.classList.add("selected");
          } else {
            opt.classList.add("unselected");
          }
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

          // 숫자 카운팅 애니메이션 호출
          animateValue(labelA, 0, percentA, 1200);
          animateValue(labelB, 0, percentB, 1200);

          // 메인 페이지(redirect-on-vote 클래스 존재 시) 1초 뒤 상세 페이지로 이동
          if (card.classList.contains("redirect-on-vote")) {
            setTimeout(() => {
              window.location.href = "detail.html";
            }, 1000);
          }
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

  // 3. Shorts Action Buttons & Comment Panel Interaction
  const shortsContainer = document.querySelector(".shorts-container");

  if (shortsContainer) {
    // 3-1. 모든 쇼츠 카드에 동적으로 액션바(버튼) 자동 추가
    const cards = shortsContainer.querySelectorAll(".vote-card");
    cards.forEach((card) => {
      if (!card.querySelector(".action-bar")) {
        const actionBar = document.createElement("div");
        actionBar.className = "action-bar";
        actionBar.innerHTML = `
          <button class="action-btn like-btn">
            <span class="icon">👍</span><span class="count">1.2천</span>
          </button>
          <button class="action-btn dislike-btn">
            <span class="icon">👎</span><span class="count">싫어요</span>
          </button>
          <button class="action-btn comment-btn">
            <span class="icon">💬</span><span class="count">128</span>
          </button>
          <button class="action-btn save-btn">
            <span class="icon">🔖</span><span class="count">저장</span>
          </button>
          <button class="action-btn share-btn">
            <span class="icon">↗️</span><span class="count">공유</span>
          </button>
        `;
        card.appendChild(actionBar);
      }
    });

    // 3-2. 모달 열기/닫기 로직
    const commentsOverlay = document.getElementById("comments-overlay");
    const closeCommentsBtn = document.getElementById("close-comments");
    const commentBtns = document.querySelectorAll(".comment-btn");

    if (commentsOverlay) {
      // 댓글 버튼 클릭 시 모달창 열기
      commentBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
          commentsOverlay.classList.add("active");
        });
      });

      // 닫기 버튼 클릭 시 모달창 닫기
      if (closeCommentsBtn) {
        closeCommentsBtn.addEventListener("click", () => {
          commentsOverlay.classList.remove("active");
        });
      }

      // 모달 바깥쪽(어두운 배경) 클릭 시 모달창 닫기
      commentsOverlay.addEventListener("click", (e) => {
        if (e.target === commentsOverlay) {
          commentsOverlay.classList.remove("active");
        }
      });
    }
  }
});
