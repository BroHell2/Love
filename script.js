// Логика сайта: привязка к IP (1 прохождение), запоминание 2 слайда, админ-меню HELL со сбросом

document.addEventListener('DOMContentLoaded', async () => {
  // Элементы слайдов
  const slide1 = document.getElementById('slide-1');
  const slide2 = document.getElementById('slide-2');
  const slideResult = document.getElementById('slide-result');

  // Кнопки Слайда 1
  const btnYes1 = document.getElementById('btn-yes-1');
  const btnNo1 = document.getElementById('btn-no-1');

  // Кнопки Слайда 2
  const btnYes2 = document.getElementById('btn-yes-2');
  const btnNo2 = document.getElementById('btn-no-2');

  // Элементы экрана результата
  const resultHeading = document.getElementById('result-heading');
  const resultSvgContainer = document.getElementById('result-svg-container');
  const lockNotice = document.getElementById('lock-notice');
  const btnReturn = document.getElementById('btn-return');

  // Секретный триггер и модальное окно
  const codeLineTrigger = document.getElementById('code-line-trigger');
  const secretAdminTrigger = document.getElementById('secret-admin-trigger');
  const adminModal = document.getElementById('admin-modal');
  const adminCloseBtn = document.getElementById('admin-close-btn');
  const btnCloseAdmin = document.getElementById('btn-close-admin');
  const btnClearData = document.getElementById('btn-clear-data');
  const answersTableBody = document.getElementById('answers-table-body');
  const adminStatsSummary = document.getElementById('admin-stats-summary');

  // Ключ хранилища
  const STORAGE_KEY = 'app_ip_sessions_v1';

  // SVG иконка сердца
  const svgHeart = `
    <svg viewBox="0 0 24 24" fill="none" stroke="#235c29" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
  `;

  // SVG иконка дружбы
  const svgFriend = `
    <svg viewBox="0 0 24 24" fill="none" stroke="#756d65" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  `;

  // ==========================================
  // Определение IP клиента
  // ==========================================
  let currentClientIp = null;

  async function fetchIp() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const res = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data.ip) return data.ip;
      }
    } catch (e) {
      // Игнорируем сетевую ошибку и используем локальный резервный идентификатор
    }

    let localId = localStorage.getItem('local_fallback_client_id');
    if (!localId) {
      localId = 'ip-' + Math.floor(100 + Math.random() * 899) + '.' + Math.floor(10 + Math.random() * 89) + '.xx';
      localStorage.setItem('local_fallback_client_id', localId);
    }
    return localId;
  }

  // ==========================================
  // База данных по IP
  // ==========================================
  function getSessionsMap() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveSession(ip, updates) {
    const map = getSessionsMap();
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const deviceType = isMobile ? `Телефон (${window.innerWidth}x${window.innerHeight})` : `ПК (${window.innerWidth}x${window.innerHeight})`;

    const existing = map[ip] || { ip: ip, history: [] };
    const merged = {
      ...existing,
      ...updates,
      device: deviceType,
      updatedAt: new Date().toLocaleString('ru-RU')
    };

    map[ip] = merged;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  // ==========================================
  // Переключение слайдов
  // ==========================================
  function showSlide(slideToShow) {
    slide1.classList.remove('active');
    slide2.classList.remove('active');
    slideResult.classList.remove('active');

    resetRunningButton();
    slideToShow.classList.add('active');
  }

  // ==========================================
  // Отображение финала
  // ==========================================
  function displayFinalResult(answer, isLocked = false) {
    if (answer === 'ДА') {
      resultSvgContainer.innerHTML = svgHeart;
      resultHeading.textContent = 'Я не сомневался';
    } else {
      resultSvgContainer.innerHTML = svgFriend;
      resultHeading.textContent = 'Надеюсь, друзьями останемся';
    }

    if (isLocked) {
      btnReturn.style.display = 'none';
      lockNotice.style.display = 'block';
    } else {
      btnReturn.style.display = 'inline-flex';
      lockNotice.style.display = 'none';
    }

    showSlide(slideResult);
  }

  // ==========================================
  // Инициализация состояния при заходе на сайт
  // ==========================================
  currentClientIp = await fetchIp();
  const sessions = getSessionsMap();
  const userSession = sessions[currentClientIp];

  if (userSession) {
    if (userSession.status === 'completed') {
      // Пользователь уже завершил все слайды — повторно нельзя
      displayFinalResult(userSession.answer, true);
    } else if (userSession.status === 'in_progress_slide_2') {
      // Пользователь остановился на втором слайде — открываем второй слайд
      showSlide(slide2);
    } else {
      showSlide(slide1);
    }
  } else {
    showSlide(slide1);
  }

  // ==========================================
  // Логика кнопки "НЕТ" (Слайд 1)
  // Уворачивается локально внутри карточки
  // ==========================================
  let dodgeStep = 0;
  const localDodgeOffsets = [
    { x: 38, y: -24 },
    { x: -32, y: 26 },
    { x: 42, y: 22 },
    { x: -36, y: -20 },
    { x: 40, y: -15 },
    { x: -28, y: 24 }
  ];

  function moveNoButton() {
    const offset = localDodgeOffsets[dodgeStep % localDodgeOffsets.length];
    dodgeStep++;
    btnNo1.style.transform = `translate(${offset.x}px, ${offset.y}px)`;
  }

  function resetRunningButton() {
    btnNo1.style.transform = 'translate(0px, 0px)';
    dodgeStep = 0;
  }

  btnNo1.addEventListener('mouseenter', moveNoButton);
  btnNo1.addEventListener('mouseover', moveNoButton);

  btnNo1.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    moveNoButton();
  });

  btnNo1.addEventListener('click', (e) => {
    e.preventDefault();
    moveNoButton();
  });

  // ==========================================
  // Слайд 1: Нажатие "ДА"
  // Переход на 2 слайд и фиксация состояния
  // ==========================================
  btnYes1.addEventListener('click', () => {
    saveSession(currentClientIp, {
      status: 'in_progress_slide_2',
      slide1Answer: 'ДА'
    });
    showSlide(slide2);
  });

  // ==========================================
  // Слайд 2: Нажатие "ДА"
  // Завершение прохождения (блокировка повторного прохода)
  // ==========================================
  btnYes2.addEventListener('click', () => {
    saveSession(currentClientIp, {
      status: 'completed',
      answer: 'ДА'
    });
    displayFinalResult('ДА', true);
  });

  // ==========================================
  // Слайд 2: Нажатие "НЕТ"
  // Завершение прохождения (блокировка повторного прохода)
  // ==========================================
  btnNo2.addEventListener('click', () => {
    saveSession(currentClientIp, {
      status: 'completed',
      answer: 'НЕТ'
    });
    displayFinalResult('НЕТ', true);
  });

  // Кнопка возврата (если доступна)
  btnReturn.addEventListener('click', () => {
    showSlide(slide1);
  });

  // ==========================================
  // Секретный вход: "HELL"
  // ==========================================
  let keySequence = '';
  const SECRET_CODE_EN = 'hell';
  const SECRET_CODE_RU = 'рудд';

  function unlockSecretAdmin() {
    secretAdminTrigger.style.display = 'inline-flex';
    openAdminModal();
  }

  window.addEventListener('keydown', (e) => {
    keySequence += e.key.toLowerCase();
    if (keySequence.length > 10) {
      keySequence = keySequence.slice(-10);
    }

    if (keySequence.includes(SECRET_CODE_EN) || keySequence.includes(SECRET_CODE_RU)) {
      unlockSecretAdmin();
      keySequence = '';
    }
  });

  codeLineTrigger.addEventListener('click', () => {
    const input = prompt('Введите секретный ключ доступа:');
    if (input && (input.trim().toLowerCase() === SECRET_CODE_EN || input.trim().toLowerCase() === SECRET_CODE_RU)) {
      unlockSecretAdmin();
    }
  });

  secretAdminTrigger.addEventListener('click', openAdminModal);

  // ==========================================
  // Логика Админ-меню (список IP со сбросом)
  // ==========================================
  function openAdminModal() {
    renderAdminTable();
    adminModal.classList.add('active');
  }

  function closeAdminModal() {
    adminModal.classList.remove('active');
  }

  adminCloseBtn.addEventListener('click', closeAdminModal);
  btnCloseAdmin.addEventListener('click', closeAdminModal);

  adminModal.addEventListener('click', (e) => {
    if (e.target === adminModal) {
      closeAdminModal();
    }
  });

  // Отрисовка таблицы IP и статусов
  function renderAdminTable() {
    answersTableBody.innerHTML = '';
    const map = getSessionsMap();
    const ips = Object.keys(map);

    adminStatsSummary.textContent = `Всего уникальных посетителей: ${ips.length} | Ваш IP: ${currentClientIp}`;

    if (ips.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `<td colspan="6" style="text-align: center; color: var(--text-muted); padding: 18px;">Пока нет зафиксированных заходов</td>`;
      answersTableBody.appendChild(emptyRow);
      return;
    }

    ips.slice().reverse().forEach(ip => {
      const item = map[ip];
      const tr = document.createElement('tr');

      const statusText = item.status === 'completed' ? 'Завершено' : (item.status === 'in_progress_slide_2' ? 'На 2 слайде' : 'Начало');
      const answerBadge = item.answer === 'ДА' 
        ? '<span class="admin-badge-yes">ДА</span>' 
        : (item.answer === 'НЕТ' ? '<span class="admin-badge-no">НЕТ</span>' : '-');

      tr.innerHTML = `
        <td><code>${item.ip}</code></td>
        <td>${statusText}</td>
        <td>${answerBadge}</td>
        <td>${item.updatedAt || '-'}</td>
        <td>${item.device || '-'}</td>
        <td><button type="button" class="btn-reset-user" data-ip="${item.ip}">Сбросить</button></td>
      `;
      answersTableBody.appendChild(tr);
    });

    // Навешиваем слушатели на кнопки сброса
    document.querySelectorAll('.btn-reset-user').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetIp = e.currentTarget.getAttribute('data-ip');
        resetUserByIp(targetIp);
      });
    });
  }

  // Функция сброса доступа для конкретного IP
  function resetUserByIp(ipToReset) {
    if (confirm(`Сбросить прохождение для IP: ${ipToReset}? Этот человек сможет пройти сайт заново.`)) {
      const map = getSessionsMap();
      delete map[ipToReset];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));

      // Если сброшен текущий пользователь — возвращаем его на Слайд 1
      if (ipToReset === currentClientIp) {
        showSlide(slide1);
        btnReturn.style.display = 'inline-flex';
        lockNotice.style.display = 'none';
      }

      renderAdminTable();
    }
  }

  // Полная очистка всей базы
  btnClearData.addEventListener('click', () => {
    if (confirm('Очистить всю базу данных посетителей и сбросить все IP?')) {
      localStorage.removeItem(STORAGE_KEY);
      showSlide(slide1);
      btnReturn.style.display = 'inline-flex';
      lockNotice.style.display = 'none';
      renderAdminTable();
    }
  });

  // Сброс уворота кнопки при изменении окна
  window.addEventListener('resize', () => {
    if (slide1.classList.contains('active')) {
      resetRunningButton();
    }
  });
});
