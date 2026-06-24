const appState = {
            activeDomain: 'A',
            activeSubModule: 'A1',
            sidebarExpanded: false,
            dashboardChart: null,
            heatmapInterval: null
        };

        const siteMap = {
            A: {
                title: "Project Overview",
                icon: "fa-compass",
                color: "#10b981",
                bgGradient: "bg-emerald-600/20",
                subModules: [
                    { id: "A1", name: "Real-time Dashboard", icon: "fa-chart-pie" },
                    { id: "A2", name: "Roadmap Board", icon: "fa-timeline" },
                    { id: "A3", name: "Capability Plugins", icon: "fa-plug" },
                    { id: "A4", name: "Brain & Config", icon: "fa-brain" },
                    { id: "A5", name: "Agent Management", icon: "fa-robot" }
                ]
            }
        };

        // --- WebSocket Setup ---
        let socket = null;
        let reconnectTimer = null;
        let activeTaskId = null;
        let telData = { cost: 0.0490, calls: 14, tools: 28, in: 37202, out: 4470, time: 84 };

        function connectWebSocket() {
            const statusEl = document.getElementById('connection-status');
            const wsUrl = `ws://${window.location.hostname || 'localhost'}:8787`;
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                if (statusEl) {
                    statusEl.className = "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
                    statusEl.title = 'Connected';
                }
                logTerminal('sys', 'Connected to CoDev Agent Server.');
                if (reconnectTimer) {
                    clearInterval(reconnectTimer);
                    reconnectTimer = null;
                }
            };

            socket.onclose = () => {
                if (statusEl) {
                    statusEl.className = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
                    statusEl.title = 'Disconnected (Trying to reconnect...)';
                }
                logTerminal('sys', 'WebSocket connection closed. Retrying in 5s...');
                if (!reconnectTimer) {
                    reconnectTimer = setInterval(connectWebSocket, 5000);
                }
            };

            socket.onerror = () => {
                if (statusEl) statusEl.className = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'agent_log') {
                        const stream = data.stream;
                        const type = stream === 'stderr' ? 'warn' : (stream === 'system' ? 'sys' : 'eva');
                        logTerminal(type, data.text);
                    } else if (data.type === 'agent_status') {
                        logTerminal('sys', `Task ${data.taskId} status: ${data.status}`);
                        const taskItem = document.querySelector(`.task-item[data-task-id="${data.taskId}"]`);
                        if (taskItem) {
                            const selectEl = taskItem.querySelector('.assist-to-select');
                            const currentAssignee = selectEl ? selectEl.value : 'none';
                            setTaskItemState(taskItem, data.status === 'success' ? { doc: true, code: true, test: true, assignee: currentAssignee } : 'todo');
                            saveStateToStorage();
                            calculateRoadmapProgress();
                        }
                    } else if (data.type === 'agent_output') {
                        const text = data.data.trim();
                        if (text) logTerminal('eva', text);
                    } else if (data.type === 'agent_error') {
                        const text = data.data.trim();
                        if (text) logTerminal('warn', text);
                    } else if (data.type === 'error') {
                        logTerminal('warn', data.data);
                    } else if (data.type === 'status') {
                        logTerminal('sys', data.data);
                    } else if (data.type === 'live_hardware_sample') {
                        updateLiveHardwareSample(data.sample);
                    }
                } catch (err) {
                    console.error('Error parsing WS message:', err);
                }
            };
        }

        // --- Domain Switcher ---
        function switchDomain(domainId) {
            appState.activeDomain = domainId;
            const domainInfo = siteMap[domainId];

            document.querySelectorAll('.domain-tab-btn').forEach(btn => {
                btn.className = "domain-tab-btn px-4 py-1.5 rounded-lg text-sm font-semibold tracking-wide flex items-center gap-2 transition-all duration-300 text-gray-400 hover:text-white hover:bg-white/5";
            });

            const activeBtn = document.getElementById(`domain-tab-${domainId}`);
            let themeColor = domainInfo.color;

            if (activeBtn) {
                activeBtn.className = `domain-tab-btn px-4 py-1.5 rounded-lg text-sm font-semibold tracking-wide flex items-center gap-2 transition-all duration-300 bg-white/10 shadow-lg`;
                if (domainId === 'A') { activeBtn.classList.add('text-emerald-400', 'border', 'border-emerald-500/20'); }
            }

            document.documentElement.style.setProperty('--active-accent', themeColor);

            const orbLeft = document.getElementById('orb-left');
            if (orbLeft) {
                orbLeft.className = `glow-orb w-[45vw] h-[45vw] top-[-10%] left-[-10%] ${domainInfo.bgGradient}`;
            }

            const contextIcon = document.getElementById('sidebar-context-icon');
            if (contextIcon) {
                contextIcon.innerHTML = `<i class="fa-solid ${domainInfo.icon}"></i>`;
                contextIcon.style.color = themeColor;
                contextIcon.style.backgroundColor = `${themeColor}20`;
                contextIcon.style.borderColor = `${themeColor}30`;
            }

            const contextTitle = document.getElementById('sidebar-context-title');
            if (contextTitle) {
                contextTitle.innerText = domainInfo.title;
            }

            const subNavContainer = document.getElementById('sidebar-sub-nav');
            if (subNavContainer) {
                subNavContainer.innerHTML = '';
                domainInfo.subModules.forEach((sub, idx) => {
                    const li = document.createElement('li');
                    li.className = 'nav-item relative';
                    li.setAttribute('data-tooltip', sub.name);

                    const activeSubClass = (idx === 0) ? 'bg-white/5 font-semibold text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white';

                    li.innerHTML = `
                        <button onclick="switchMainView('${sub.id}', this)" class="sub-nav-item w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300 ${activeSubClass}">
                            <i class="fa-solid ${sub.icon} text-center w-5 text-sm" style="color: ${idx === 0 ? themeColor : 'inherit'}"></i>
                            <span class="sidebar-expand-content text-xs font-semibold tracking-wide truncate">${sub.name}</span>
                        </button>
                    `;
                    subNavContainer.appendChild(li);
                });
            }

            switchMainView(domainInfo.subModules[0].id);
        }

        // --- Main Views switcher ---
        function switchMainView(subModuleId, btnElement = null) {
            appState.activeSubModule = subModuleId;

            if (btnElement) {
                document.querySelectorAll('.sub-nav-item').forEach(item => {
                    item.className = "sub-nav-item w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300 text-gray-400 hover:bg-white/5 hover:text-white";
                    const icon = item.querySelector('i');
                    if (icon) icon.style.color = 'inherit';
                });
                btnElement.className = "sub-nav-item w-full flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-300 bg-white/5 font-semibold text-white";
                const activeIcon = btnElement.querySelector('i');
                if (activeIcon) activeIcon.style.color = siteMap[appState.activeDomain].color;
            }

            document.querySelectorAll('.view-block').forEach(v => v.classList.add('hidden'));

            const activeViewEl = document.getElementById(`view-${subModuleId}`);
            if (activeViewEl) {
                activeViewEl.classList.remove('hidden');
                activeViewEl.classList.remove('fade-in');
                void activeViewEl.offsetWidth;
                activeViewEl.classList.add('fade-in');
            }

            const scrollContainer = document.getElementById('main-scroll-container');
            if (scrollContainer) scrollContainer.scrollTop = 0;

            

            const footerCtx = document.getElementById('footer-context');
            if (footerCtx) {
                footerCtx.innerText = `${siteMap[appState.activeDomain].title} > ${subModuleId}`;
            }
        }

        // --- Sidebar drawer toggler ---
        function toggleSidebar() {
            const sidebar = document.getElementById('app-sidebar');
            const toggleIcon = document.getElementById('sidebar-toggle-icon');
            if (!sidebar || !toggleIcon) return;

            appState.sidebarExpanded = !appState.sidebarExpanded;
            if (appState.sidebarExpanded) {
                sidebar.classList.add('expanded-lock');
                toggleIcon.className = 'fa-solid fa-chevron-left text-center w-5';
            } else {
                sidebar.classList.remove('expanded-lock');
                toggleIcon.className = 'fa-solid fa-chevron-right text-center w-5';
            }
        }

        // --- Theme management ---
        function toggleTheme() {
            const body = document.body;
            const sunIcon = document.getElementById('sun-icon');
            const moonIcon = document.getElementById('moon-icon');
            if (!body || !sunIcon || !moonIcon) return;

            if (body.classList.contains('light-theme')) {
                body.classList.remove('light-theme');
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            } else {
                body.classList.add('light-theme');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            }
            updateChartColors();
        }

        function updateChartColors() {
            if (!appState.dashboardChart) return;
            const isLight = document.body.classList.contains('light-theme');
            const textColor = isLight ? '#18181b' : '#f3f4f6';
            const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';

            appState.dashboardChart.options.scales.y.grid.color = gridColor;
            appState.dashboardChart.options.scales.y.ticks.color = textColor;
            appState.dashboardChart.options.scales.x.ticks.color = textColor;
            appState.dashboardChart.update();
        }

        // --- Roadmap Data Checklist rendering ---
        const OFFICIAL_STATE = {
            "p0-s0-1": "done", "p0-s0-2": "done", "p0-s0-3": "done", "p0-s0-4": "done", "p0-s0-5": "done", "p0-s0-6": "done",
            "p1-s1a-1": "done", "p1-s1a-2": "done", "p1-s1a-3": "done", "p1-s1a-4": "done", "p1-s1a-5": "done", "p1-s1a-6": "done", "p1-s1a-7": "done",
            "p1-s1b-1": "done", "p1-s1b-2": "done", "p1-s1b-3": "done", "p1-s1b-4": "done", "p1-s1b-5": "done", "p1-s1b-6": "done",
            "p2-s2a-1": "done", "p2-s2a-2": "done", "p2-s2a-3": "done", "p2-s2a-4": "done", "p2-s2a-5": "done", "p2-s2a-6": "done",
            "p2-s2b-1": "done", "p2-s2b-2": "done", "p2-s2b-3": "done", "p2-s2b-4": "done", "p2-s2b-5": "done", "p2-s2b-6": "done", "p2-s2b-7": "done",
            "p3-s3a-1": "done", "p3-s3a-2": "done", "p3-s3a-3": "todo", "p3-s3a-4": "todo", "p3-s3a-5": "todo",
            "p3-s3b-1": "todo", "p3-s3b-2": "todo", "p3-s3b-3": "todo", "p3-s3b-4": "todo", "p3-s3b-5": "todo",
            "p4-task-1": "todo", "p4-task-2": "todo", "p4-task-3": "todo", "p4-task-4": "todo"
        };

        const taskDefinitions = {
            "p0": [
                { id: "p0-s0-1", code: "TSK-CVB01P00010", text: "Prototype YouTube IFrame Player บน 2 clients พร้อมกัน", symbolLink: "src/App.tsx", complexity: "high", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:00:00+07:00,EVA Agent,a3f2b1c", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added iframe configuration sandbox; resolved background autoplay restrictions.", tokensUsed: 12040 },
                { id: "p0-s0-2", code: "TSK-CVB01P00020", text: "WebSocket room ขั้นต่ำ: สร้างห้อง / join / broadcast event", symbolLink: "server/index.js", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:10:00+07:00,Qwen Coder,b4e5f6g", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Implemented memory-backed room state storage on WebSocket server.", tokensUsed: 9800 },
                { id: "p0-s0-3", code: "TSK-CVB01P00030", text: "Play / Pause / Seek sync เบื้องต้น", symbolLink: "src/App.tsx", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:15:00+07:00,EVA Agent,c5f6g7h", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Wired play state change broadcast hooks to YouTube IFrame API.", tokensUsed: 10400 },
                { id: "p0-s0-4", code: "TSK-CVB01P00040", text: "วัด drift จริงระหว่าง 2 เครื่อง", symbolLink: "src/App.tsx", complexity: "high", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:20:00+07:00,UAT Agent,d6g7h8i", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Logged latency samples of WebSocket transport during sync phase.", tokensUsed: 11200 },
                { id: "p0-s0-5", code: "TSK-CVB01P00050", text: "ทดสอบบน iOS Safari + Android Chrome", symbolLink: "docs/compatibility_report.md", complexity: "high", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:25:00+07:00,UAT Agent,e7h8i9j", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added compatibility notes regarding Safari background execution blocks.", tokensUsed: 7500 },
                { id: "p0-s0-6", code: "TSK-CVB01P00060", text: "ระบุข้อจำกัด autoplay / background playback / wake lock", symbolLink: "docs/compatibility_report.md", complexity: "nomal", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:30:00+07:00,EVA Agent,f8i9j0k", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Drafted OLED Saver mode specification as a workaround for autoplay blocks.", tokensUsed: 8400 }
            ],
            "p1": [
                { id: "p1-s1a-1", code: "TSK-CVB01P0101A", text: "ตั้งโปรเจกต์ React + Vite (PWA manifest, service worker shell)", symbolLink: "package.json", complexity: "nomal", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:35:00+07:00,Qwen Coder,g9j0k1l", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Initialized project directory structure with Vite React template.", tokensUsed: 9400 },
                { id: "p1-s1a-2", code: "TSK-CVB01P0102A", text: "Backend Node.js + TypeScript + WebSocket room state ในเมมโมรี่", symbolLink: "server/index.js", complexity: "high", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:40:00+07:00,Qwen Coder,h0k1l2m", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Setup TS environment and basic router for room creation commands.", tokensUsed: 11000 },
                { id: "p1-s1a-3", code: "TSK-CVB01P0103A", dependency: "p0-s0-2", text: "Rider: สร้างห้อง → รับ roomId → แสดง QR code", symbolLink: "src/App.tsx", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:45:00+07:00,EVA Agent,i1l2m3n", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Integrated QR generation library and dynamic URL link bindings.", tokensUsed: 8900 },
                { id: "p1-s1a-4", code: "TSK-CVB01P0104A", text: "QR generator + share link", symbolLink: "src/App.tsx", complexity: "low", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:50:00+07:00,EVA Agent,j2m3n4o", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added navigator.share fallback compatibility for mobile clients.", tokensUsed: 5400 },
                { id: "p1-s1a-5", code: "TSK-CVB01P0105A", text: "Passenger: สแกน QR → ใส่ชื่อ → join ห้อง", symbolLink: "src/App.tsx", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T09:55:00+07:00,EVA Agent,k3n4o5p", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added input controls for Passenger session initialization.", tokensUsed: 9200 },
                { id: "p1-s1a-6", code: "TSK-CVB01P0106A", text: "Participant presence (connected / disconnected)", symbolLink: "server/index.js", complexity: "low", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:00:00+07:00,Qwen Coder,l4o5p6q", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Implemented connection heartbeats for stale participant pruning.", tokensUsed: 7800 },
                { id: "p1-s1a-7", code: "TSK-CVB01P0107A", text: "Thai UI ขั้นพื้นฐาน, dark mode, mobile-first layout", symbolLink: "src/styles.css", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:05:00+07:00,EVA Agent,m5p6q7r", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Styled mobile responsive screens; added dark theme variables.", tokensUsed: 10500 },
                { id: "p1-s1b-1", code: "TSK-CVB01P0108B", text: "YouTube link parser + YouTube IFrame API integration", symbolLink: "src/App.tsx", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:10:00+07:00,EVA Agent,n6q7r8s", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Setup regex mapping to support shorts/standard YouTube URLs.", tokensUsed: 9100 },
                { id: "p1-s1b-2", code: "TSK-CVB01P0109B", text: "Queue เพลง: add / remove / reorder", symbolLink: "src/App.tsx", complexity: "high", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:15:00+07:00,Qwen Coder,o7r8s9t", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Created state reducer tracking mutations in play queue array.", tokensUsed: 11500 },
                { id: "p1-s1b-3", code: "TSK-CVB01P0110B", text: "Current track state บน server (trackId, positionMs, serverStartedAt)", symbolLink: "server/index.js", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:20:00+07:00,Qwen Coder,p8s9t0u", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added server timestamp offsets tracking when track transitions happen.", tokensUsed: 8300 },
                { id: "p1-s1b-4", code: "TSK-CVB01P0111B", text: "Play / Pause / Skip / Seek ซิงค์ผ่าน WebSocket", symbolLink: "src/App.tsx", complexity: "high", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:25:00+07:00,Qwen Coder,q9t0u1v", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Synchronized participant seeking controls to prevent loop feedback.", tokensUsed: 12500 },
                { id: "p1-s1b-5", code: "TSK-CVB01P0112B", text: "Auto-next เมื่อเพลงจบ", symbolLink: "src/App.tsx", complexity: "low", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:30:00+07:00,EVA Agent,r0u1v2w", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added playState callbacks updating play status in queue reducer.", tokensUsed: 6200 },
                { id: "p1-s1b-6", code: "TSK-CVB01P0113B", text: "Volume control แยกแต่ละ device", symbolLink: "src/App.tsx", complexity: "less", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:35:00+07:00,EVA Agent,s1v2w3x", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added HTML5 range slider mapping device-specific sound levels.", tokensUsed: 4500 }
            ],
            "p2": [
                { id: "p2-s2a-1", code: "TSK-CVB01P0201A", dependency: "p0-s0-4", text: "Drift correction algorithm (<250ms ปล่อย / 250-800ms ปรับ rate / >800ms seek)", symbolLink: "src/App.tsx", complexity: "extream", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:40:00+07:00,Qwen Coder,t2w3x4y", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Designed drift correction logic: adjusts rate to 0.95x/1.05x dynamically.", tokensUsed: 16800 },
                { id: "p2-s2a-2", code: "TSK-CVB01P0202A", text: "Latency ping ทุก 3 วินาที + clock sync กับ server", symbolLink: "src/App.tsx", complexity: "high", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:45:00+07:00,Qwen Coder,u3x4y5z", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Setup round-trip-time offset estimator inside transport controller.", tokensUsed: 13200 },
                { id: "p2-s2a-3", code: "TSK-CVB01P0203A", text: "Reconnect อัตโนมัติหลังเน็ตหลุด + resync position", symbolLink: "src/App.tsx", complexity: "high", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:50:00+07:00,Qwen Coder,v4y5z6a", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added auto-reconnecting WebSocket client wrappers with expo-backoff.", tokensUsed: 12000 },
                { id: "p2-s2a-4", code: "TSK-CVB01P0204A", text: "Buffer state handling + แจ้งเตือนผู้ใช้เมื่อเน็ตช้า", symbolLink: "src/App.tsx", complexity: "nomal", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T10:55:00+07:00,Qwen Coder,w5z6a7b", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added slow transport alert indicators overlaying main player.", tokensUsed: 9600 },
                { id: "p2-s2a-5", code: "TSK-CVB01P0205A", text: "Host handoff fallback เมื่อผู้เปิดห้องตัดการเชื่อมต่อ", symbolLink: "server/index.js", complexity: "high", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:00:00+07:00,Qwen Coder,x6a7b8c", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Implemented room ownership migration triggers during rider offline states.", tokensUsed: 11000 },
                { id: "p2-s2a-6", code: "TSK-CVB01P0206A", text: "Drift metric logging เพื่อใช้ในการ debug พฤติกรรมการซิงค์", symbolLink: "server/index.js", complexity: "nomal", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:05:00+07:00,Qwen Coder,y7b8c9d", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Integrated drift sampling telemetry pipelines broadcasted to control centers.", tokensUsed: 9200 },
                { id: "p2-s2b-1", code: "TSK-CVB01P0207B", text: "Rider dashboard ปุ่มใหญ่ (Play/Pause/Skip) แตะง่าย", symbolLink: "src/App.tsx", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:10:00+07:00,EVA Agent,z8c9d0e", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Created high-contrast Rider layout panels with expanded touchscreen zones.", tokensUsed: 10400 },
                { id: "p2-s2b-2", code: "TSK-CVB01P0208B", text: "OLED Saver / Black Screen mode ประหยัดพลังงาน", symbolLink: "src/App.tsx", complexity: "low", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:15:00+07:00,EVA Agent,a9d0e1f", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added full screen black overlay keeping system wake locks active.", tokensUsed: 7800 },
                { id: "p2-s2b-3", code: "TSK-CVB01P0209B", text: "Passenger remote: ค้นหา YouTube + เพิ่มเพลง", symbolLink: "src/App.tsx", complexity: "high", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:20:00+07:00,Qwen Coder,b0e1f2g", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Wired search proxy querying public YouTube search endpoints.", tokensUsed: 13500 },
                { id: "p2-s2b-4", code: "TSK-CVB01P0210B", text: "Trip summary หน้าสรุปรายละเอียดการเดินทาง", symbolLink: "src/App.tsx", complexity: "low", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:25:00+07:00,EVA Agent,c1f2g3h", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added stats screen summarizing tracks played and total travel time.", tokensUsed: 8500 },
                { id: "p2-s2b-5", code: "TSK-CVB01P0211B", text: "Analytics events (กิจกรรมห้อง, อัตราดริฟต์เฉลี่ย)", symbolLink: "server/index.js", complexity: "nomal", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:30:00+07:00,Qwen Coder,d2g3h4i", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Setup local data persistence for analytical sync tracking summaries.", tokensUsed: 10100 },
                { id: "p2-s2b-6", code: "TSK-CVB01P0212B", text: "Error tracking integration (รายงาน crash)", symbolLink: "src/main.tsx", complexity: "low", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:35:00+07:00,Qwen Coder,e3h4i5j", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Wired central event logger boundaries around React app context tree.", tokensUsed: 8000 },
                { id: "p2-s2b-7", code: "TSK-CVB01P0213B", text: "CoDev Command Center architecture refactor (Full Modularization)", symbolLink: "codev_dashboard.html", complexity: "extream", type: "NFR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:40:00+07:00,Qwen Coder,f4i5j6k", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Consolidated isolated views inside responsive dashboard containers.", tokensUsed: 19400 }
            ],
            "p3": [
                { id: "p3-s3a-1", code: "TSK-CVB01P0301A", text: "Beta onboarding flow อธิบาย autoplay + วิธีเชื่อมต่อ", symbolLink: "src/App.tsx", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:45:00+07:00,EVA Agent,g5j6k7l", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Implemented interactive multi-step wizard describing playback rules.", tokensUsed: 9800 },
                { id: "p3-s3a-2", code: "TSK-CVB01P0302A", text: "In-app feedback form + rating ประเมินหลังเดินทาง", symbolLink: "src/App.tsx", complexity: "nomal", type: "FR", status: "stable", version: "1.0.0", created_at: "2026-06-05T11:50:00+07:00,EVA Agent,h6k7l8m", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added star ratings and text feedback inputs saving post-trip notes.", tokensUsed: 10200 },
                { id: "p3-s3a-3", code: "TSK-CVB01P0303A", text: "รับสมัครกลุ่มผู้ขี่มอเตอร์ไซค์ 20-50 คู่มาร่วมทดสอบ", symbolLink: "docs/compatibility_report.md", complexity: "low", type: "NFR", status: "Active(beta)", version: "0.1.0b", created_at: "2026-06-05T11:55:00+07:00,Local Dev,i7l8m9n", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Drafted user recruitment forms and onboarding procedures checklist.", tokensUsed: 5200 },
                { id: "p3-s3a-4", code: "TSK-CVB01P0304A", text: "ทำสื่อคลิปสั้นอธิบายระบบลง Reels/TikTok", symbolLink: "docs/compatibility_report.md", complexity: "less", type: "NFR", status: "candidate", version: "0.1.0", created_at: "2026-06-05T12:00:00+07:00,Local Dev,j8m9n0o", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Uploaded demo walkthrough showing device sync during live driving test.", tokensUsed: 4000 },
                { id: "p3-s3a-5", code: "TSK-CVB01P0305A", text: "ผลิตสื่อ QR Code ประชาสัมพันธ์ติดร้านบิ๊กไบค์", symbolLink: "docs/compatibility_report.md", complexity: "less", type: "NFR", status: "candidate", version: "0.1.0", created_at: "2026-06-05T12:05:00+07:00,Local Dev,k9n0o1p", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Designed flyer layout containing scan links to the beta signups app.", tokensUsed: 4200 },
                { id: "p3-s3b-1", code: "TSK-CVB01P0306B", text: "Usage Dashboard: ตรวจสอบความถี่และชั่วโมงการเปิดซิงค์เพลง", symbolLink: "server/index.js", complexity: "nomal", type: "FR", status: "under review", version: "0.1.0b", created_at: "2026-06-05T12:10:00+07:00,Qwen Coder,l0o1p2q", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Constructed analytics dashboard modules parsing backend log files.", tokensUsed: 9600 },
                { id: "p3-s3b-2", code: "TSK-CVB01P0307B", text: "Retention tracking: อัตราการกลับมาเปิดเล่นซ้ำใน 7 วัน", symbolLink: "server/index.js", complexity: "nomal", type: "NFR", status: "under review", version: "0.1.0b", created_at: "2026-06-05T12:15:00+07:00,Qwen Coder,m1p2q3r", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Calculated active participant cohort ratios comparing week-over-week logs.", tokensUsed: 9800 },
                { id: "p3-s3b-3", code: "TSK-CVB01P0308B", text: "รวบรวม Bugs ยอดฮิต 5 อันดับแรกเพื่อจัดคิวแก้ไข", symbolLink: "docs/compatibility_report.md", complexity: "low", type: "NFR", status: "draft", version: "0.1.0", created_at: "2026-06-05T12:20:00+07:00,Local Dev,n2q3r4s", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Aggregated crashlytics counts into actionable high priority bug cards.", tokensUsed: 4800 },
                { id: "p3-s3b-4", code: "TSK-CVB01P0309B", text: "สรุป Persona ผู้ใช้ที่ชอบฟีเจอร์นี้มากที่สุด", symbolLink: "docs/compatibility_report.md", complexity: "less", type: "NFR", status: "draft", version: "0.1.0", created_at: "2026-06-05T12:25:00+07:00,Local Dev,o3r4s5t", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Categorized user segments based on average trip distance stats.", tokensUsed: 3600 },
                { id: "p3-s3b-5", code: "TSK-CVB01P0310B", text: "เปิดอัปเดต Quick-fix แก้ปัญหาเร่งด่วนตามเสียงตอบรับ", symbolLink: "src/App.tsx", complexity: "nomal", type: "FR", status: "draft", version: "0.1.0", created_at: "2026-06-05T12:30:00+07:00,Local Dev,p4s5t6u", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Prepared micro patch pipeline handling critical audio exceptions.", tokensUsed: 8600 }
            ],
            "p4": [
                { id: "p4-task-1", code: "TSK-CVB01P04010", text: "Hotspot / Local WebSocket (ซิงค์ตรงโดยไม่พึ่งอินเทอร์เน็ต)", symbolLink: "server/index.js", complexity: "extream", type: "NFR", status: "draft", version: "0.1.0", created_at: "2026-06-05T12:35:00+07:00,Qwen Coder,q5t6u7v", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Proposed architecture utilizing device hotspot peer connections.", tokensUsed: 15400 },
                { id: "p4-task-2", code: "TSK-CVB01P04020", text: "Intercom voice chat สนทนาเสียงแบบสายตรงในแอป", symbolLink: "src/App.tsx", complexity: "extream", type: "FR", status: "draft", version: "0.1.0", created_at: "2026-06-05T12:40:00+07:00,EVA Agent,r6u7v8w", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Analyzed WebRTC signalling flow for P2P local voice networks.", tokensUsed: 14800 },
                { id: "p4-task-3", code: "TSK-CVB01P04030", text: "Convoy GPS tracking ติดตามแผนที่ของเพื่อนร่วมคาราวาน", symbolLink: "src/App.tsx", complexity: "high", type: "FR", status: "draft", version: "0.1.0", created_at: "2026-06-05T12:45:00+07:00,Local Dev,s7v8w9x", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Drafted geolocation interval tracking APIs mapped to Leaflet graphs.", tokensUsed: 11000 },
                { id: "p4-task-4", code: "TSK-CVB01P04040", text: "Voice command สั่งงานระบบคิวเพลงด้วยเสียง", symbolLink: "src/App.tsx", complexity: "high", type: "FR", status: "draft", version: "0.1.0", created_at: "2026-06-05T12:50:00+07:00,Local Dev,t8w9x0y", last_update: "2026-06-05T16:22:00+07:00,Rwang,d4e5f6g", changelog: "Added speech-to-text libraries capturing driver override actions.", tokensUsed: 12200 }
            ]
        };

        function togglePhase(phaseId) {
            const phaseEl = document.getElementById(phaseId);
            if (!phaseEl) return;
            const body = phaseEl.querySelector('.phase-body');
            const icon = phaseEl.querySelector('.phase-chevron');
            if (!body || !icon) return;

            const isOpen = body.classList.contains('open');
            if (isOpen) {
                body.classList.remove('open');
                icon.classList.remove('open');
            } else {
                body.classList.add('open');
                icon.classList.add('open');
                setTimeout(() => {
                    phaseEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 150);
            }
        }

        function loadState() {
            let savedState = localStorage.getItem('covibe_roadmap_states_v3');
            if (savedState) {
                try { return JSON.parse(savedState); } catch (e) { }
            }
            const defaultState = {};
            for (const k in OFFICIAL_STATE) {
                const isDone = OFFICIAL_STATE[k] === 'done';
                defaultState[k] = { doc: isDone, code: isDone, test: isDone, assignee: 'none' };
            }
            return defaultState;
        }

        function saveStateToStorage() {
            const currentState = {};
            document.querySelectorAll('#roadmap-view .task-item').forEach(taskItem => {
                const taskId = taskItem.getAttribute('data-task-id');
                if (!taskId) return;
                const doc = taskItem.dataset.doc === 'true';
                const code = taskItem.dataset.code === 'true';
                const test = taskItem.dataset.test === 'true';
                const assignSelect = taskItem.querySelector('.assist-to-select');
                const assignee = assignSelect ? assignSelect.value : 'none';
                currentState[taskId] = { doc, code, test, assignee };
            });
            localStorage.setItem('covibe_roadmap_states_v3', JSON.stringify(currentState));
        }

        // Export functionality helpers
        function toggleExportMenu(menuId) {
            const menu = document.getElementById(`export-menu-${menuId}`);
            if (!menu) return;
            const isHidden = menu.classList.contains('hidden');
            // Hide all other export menus first
            document.querySelectorAll('[id^="export-menu-"]').forEach(m => m.classList.add('hidden'));
            if (isHidden) {
                menu.classList.remove('hidden');
            }
        }

        // Close dropdowns on click-away
        window.addEventListener('click', function (e) {
            if (!e.target.closest('.relative')) {
                document.querySelectorAll('[id^="export-menu-"]').forEach(m => m.classList.add('hidden'));
            }
        });

        // Helper to stringify Javascript objects to YAML
        function toYAML(obj, indent = 0) {
            const pad = '  '.repeat(indent);
            if (obj === null) return 'null';
            if (typeof obj === 'undefined') return '';
            if (typeof obj !== 'object') {
                if (typeof obj === 'string') {
                    if (obj.includes('\n') || obj.includes(':') || obj.includes('-') || obj.includes('"') || obj.includes("'")) {
                        return JSON.stringify(obj);
                    }
                    return obj;
                }
                return String(obj);
            }
            if (Array.isArray(obj)) {
                if (obj.length === 0) return '[]';
                let res = '';
                obj.forEach(item => {
                    if (typeof item === 'object') {
                        res += `\n${pad}- ` + toYAML(item, indent + 1).trimStart();
                    } else {
                        res += `\n${pad}- ${toYAML(item, indent + 1)}`;
                    }
                });
                return res;
            }
            let res = '';
            Object.entries(obj).forEach(([key, val]) => {
                if (typeof val === 'object' && val !== null) {
                    res += `\n${pad}${key}:` + toYAML(val, indent + 1);
                } else {
                    res += `\n${pad}${key}: ${toYAML(val, indent + 1)}`;
                }
            });
            return res;
        }

        // Main data resolver for export
        function getExportPayload(target, targetId) {
            const savedStates = loadState();
            const getTaskDetails = (task) => {
                const state = savedStates[task.id] || { doc: false, code: false, test: false, assignee: 'none' };
                // Resolve dependencies
                let dependencyStatus = 'N/A';
                let dependencyCode = '';
                if (task.dependency) {
                    const depTask = Object.values(taskDefinitions).flat().find(t => t.id === task.dependency);
                    dependencyCode = depTask ? (depTask.code || depTask.id) : task.dependency;
                    const depState = savedStates[task.dependency];
                    const depResolved = depState && depState.doc && depState.code && depState.test;
                    dependencyStatus = depResolved ? 'Resolved' : 'Blocking';
                }
                return {
                    id: task.id,
                    code: task.code || '',
                    text: task.text,
                    symbolLink: task.symbolLink,
                    complexity: task.complexity,
                    type: task.type,
                    status: task.status || 'draft',
                    version: task.version || '1.0.0',
                    created_at: task.created_at || '',
                    last_update: task.last_update || '',
                    changelog: task.changelog || '',
                    tokensUsed: task.tokensUsed || 0,
                    assignee: state.assignee,
                    completionState: {
                        doc: !!state.doc,
                        code: !!state.code,
                        test: !!state.test,
                        overall: !!(state.doc && state.code && state.test)
                    },
                    dependency: task.dependency || '',
                    dependencyCode: dependencyCode,
                    dependencyStatus: dependencyStatus,
                    definitionOfDone: {
                        acceptanceCriteria: [
                            { criterion: "Spec approved", checked: !!state.doc },
                            { criterion: "Docs updated", checked: !!state.doc }
                        ],
                        successCriteria: [
                            { criterion: "Code complete", checked: !!state.code },
                            { criterion: "Lints clean", checked: !!state.code }
                        ],
                        exitCriteria: [
                            { criterion: "Tests passed", checked: !!state.test },
                            { criterion: "Regression free", checked: !!state.test }
                        ]
                    }
                };
            };

            const payload = {
                exportedAt: new Date().toISOString(),
                exportType: target
            };

            if (target === 'roadmap') {
                payload.title = "CoVibe Implementation Roadmap";
                payload.phases = {};
                Object.keys(taskDefinitions).forEach(phaseKey => {
                    const phaseTitle = getPhaseTitle(phaseKey);
                    payload.phases[phaseKey] = {
                        title: phaseTitle,
                        tasks: taskDefinitions[phaseKey].map(getTaskDetails)
                    };
                });
            } else if (target === 'phase') {
                const phaseTitle = getPhaseTitle(targetId);
                payload.phaseId = targetId;
                payload.phaseTitle = phaseTitle;
                payload.tasks = (taskDefinitions[targetId] || []).map(getTaskDetails);
            } else if (target === 'task') {
                const allTasks = Object.values(taskDefinitions).flat();
                const task = allTasks.find(t => t.id === targetId);
                if (!task) return null;
                payload.task = getTaskDetails(task);
            }
            return payload;
        }

        function getPhaseTitle(phaseKey) {
            const titles = {
                p0: "Feasibility Spike — พิสูจน์ความเสถียร",
                p1: "MVP Core — ฟังก์ชันห้องและการแชร์เพลง",
                p2: "Sync Calibration — จูนนิ่งความตรงระดับเสี้ยววิ",
                p3: "Beta Test & rider feedback — นำทางจริงบนบอร์ด",
                p4: "Future Backlog — ส่วนเสริมอนาคต"
            };
            return titles[phaseKey] || phaseKey;
        }

        // Generator for Markdown formatting
        function generateMarkdown(payload) {
            const formatTaskDoD = (task) => {
                const formatCheck = (checked) => checked ? '[x]' : '[ ]';
                return `**Definition of Done (DoD):**
- **Acceptance Criteria**
  - ${formatCheck(task.completionState.doc)} Spec approved
  - ${formatCheck(task.completionState.doc)} Docs updated
- **Success Criteria**
  - ${formatCheck(task.completionState.code)} Code complete
  - ${formatCheck(task.completionState.code)} Lints clean
- **Exit Criteria**
  - ${formatCheck(task.completionState.test)} Tests passed
  - ${formatCheck(task.completionState.test)} Regression free`;
            };

            const formatTaskBlock = (task) => {
                const depLine = task.dependency ? `\n- **Dependency:** ${task.dependencyStatus} (Depends on: \`${task.dependencyCode}\`)` : '';
                return `### [${task.code || task.id}] ${task.text}
- **Symbol Link:** \`${task.symbolLink}\`
- **Assignee:** ${task.assignee === 'none' ? 'Unassigned' : task.assignee.toUpperCase()}
- **Complexity:** ${task.complexity.toUpperCase()} | **Type:** ${task.type} | **Status:** ${task.status} | **Version:** ${task.version}
- **Tokens Used:** ${task.tokensUsed.toLocaleString()}${depLine}

${formatTaskDoD(task)}

**Changelog:**
\`\`\`
[${task.version}] - ${task.changelog.replace(/;/g, '\n' + ' '.repeat(task.version.length + 5))}
[Updated: ${task.last_update}]
\`\`\`

- **Created:** ${task.created_at}
`;
            };

            let md = `# ${payload.title || 'Export'}\n`;
            md += `*Exported At: ${payload.exportedAt}*\n\n`;

            if (payload.exportType === 'roadmap') {
                Object.keys(payload.phases).forEach(phaseKey => {
                    const phase = payload.phases[phaseKey];
                    md += `## ${phase.title} (${phaseKey.toUpperCase()})\n\n`;
                    phase.tasks.forEach(task => {
                        md += formatTaskBlock(task) + `\n---\n\n`;
                    });
                });
            } else if (payload.exportType === 'phase') {
                md += `## Phase: ${payload.phaseTitle} (${payload.phaseId.toUpperCase()})\n\n`;
                payload.tasks.forEach(task => {
                    md += formatTaskBlock(task) + `\n---\n\n`;
                });
            } else if (payload.exportType === 'task') {
                md += formatTaskBlock(payload.task);
            }
            return md;
        }

        // Trigger download
        function exportData(target, format, targetId) {
            const payload = getExportPayload(target, targetId);
            if (!payload) {
                alert("Failed to gather export data.");
                return;
            }

            let fileContent = "";
            let fileType = "";
            let fileExtension = "";

            if (format === 'json') {
                fileContent = JSON.stringify(payload, null, 2);
                fileType = "application/json";
                fileExtension = "json";
            } else if (format === 'yaml') {
                fileContent = toYAML(payload).trim();
                fileType = "text/yaml";
                fileExtension = "yaml";
            } else if (format === 'md') {
                fileContent = generateMarkdown(payload);
                fileType = "text/markdown";
                fileExtension = "md";
            }

            let filename = "";
            if (target === 'roadmap') {
                filename = `covibe-roadmap-export.${fileExtension}`;
            } else if (target === 'phase') {
                const nameSlug = getPhaseTitle(targetId).toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_]+/g, '-');
                filename = `${targetId}-${nameSlug}.${fileExtension}`;
            } else if (target === 'task') {
                const taskCode = payload.task.code || targetId;
                filename = `${taskCode}-task.${fileExtension}`;
            }

            const blob = new Blob([fileContent], { type: `${fileType};charset=utf-8;` });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Hide export dropdowns
            document.querySelectorAll('[id^="export-menu-"]').forEach(m => m.classList.add('hidden'));
        }

        function setTaskItemState(taskItem, stateData) {
            let doc = false, code = false, test = false;
            let assignee = 'none';
            if (typeof stateData === 'string') {
                if (stateData === 'done') { doc = true; code = true; test = true; }
                else if (stateData === 'pending') { doc = true; code = false; test = false; }
            } else if (stateData) {
                doc = !!stateData.doc; code = !!stateData.code; test = !!stateData.test;
                assignee = stateData.assignee || 'none';
            }

            let state = 'todo';
            if (doc && code && test) state = 'done';
            else if (doc) state = 'pending';
            taskItem.setAttribute('data-state', state);

            const docBtn = taskItem.querySelector('.doc-btn');
            const codeBtn = taskItem.querySelector('.code-btn');
            const testBtn = taskItem.querySelector('.test-btn');

            if (docBtn && codeBtn && testBtn) {
                if (doc) docBtn.classList.add('active'); else docBtn.classList.remove('active');
                if (!doc) {
                    codeBtn.classList.add('disabled'); codeBtn.classList.remove('active'); code = false;
                } else {
                    codeBtn.classList.remove('disabled');
                    if (code) codeBtn.classList.add('active'); else codeBtn.classList.remove('active');
                }
                if (!code) {
                    testBtn.classList.add('disabled'); testBtn.classList.remove('active'); test = false;
                } else {
                    testBtn.classList.remove('disabled');
                    if (test) testBtn.classList.add('active'); else testBtn.classList.remove('active');
                }
            }

            const indicator = taskItem.querySelector('.task-status-indicator');
            if (indicator) {
                if (state === 'done') {
                    indicator.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-400 text-sm"></i>';
                } else if (state === 'pending') {
                    indicator.innerHTML = '<i class="fa-solid fa-circle-half-stroke text-yellow-500 text-sm animate-pulse"></i>';
                } else {
                    indicator.innerHTML = '<i class="fa-regular fa-circle text-cyber-muted text-sm"></i>';
                }
            }

            const assignLbl = taskItem.querySelector('.assign-lbl');
            const selectEl = taskItem.querySelector('.assist-to-select');
            const completedLbl = taskItem.querySelector('.completed-by-lbl');

            if (state === 'done') {
                if (assignLbl) assignLbl.classList.add('hidden');
                if (selectEl) {
                    selectEl.classList.add('hidden');
                    if (assignee === 'none') assignee = selectEl.value;
                }
                if (completedLbl) {
                    const agentNames = {
                        none: 'Unassigned',
                        eva: 'EVA Agent (Gemini 3.5 Flash)',
                        qwen: 'Qwen Coder (Qwen2.5-Coder)',
                        uat: 'UAT Agent (GPT-4o)',
                        local: 'Local Dev (Human)'
                    };
                    completedLbl.innerText = `Completed by: ${agentNames[assignee] || assignee}`;
                    completedLbl.classList.remove('hidden');
                }
            } else {
                if (assignLbl) assignLbl.classList.remove('hidden');
                if (selectEl) {
                    selectEl.classList.remove('hidden');
                    if (assignee !== 'none') selectEl.value = assignee;
                }
                if (completedLbl) completedLbl.classList.add('hidden');
            }

            // Toggle Not Implement badge
            const notImplBadge = taskItem.querySelector('.not-impl-badge');
            if (notImplBadge) {
                if (state === 'done') {
                    notImplBadge.classList.add('hidden');
                } else {
                    notImplBadge.classList.remove('hidden');
                }
            }

            // Update DoD checkboxes
            const docChecks = taskItem.querySelectorAll('.dod-doc-check-1, .dod-doc-check-2');
            const codeChecks = taskItem.querySelectorAll('.dod-code-check-1, .dod-code-check-2');
            const testChecks = taskItem.querySelectorAll('.dod-test-check-1, .dod-test-check-2');
            docChecks.forEach(c => c.checked = doc);
            codeChecks.forEach(c => c.checked = code);
            testChecks.forEach(c => c.checked = test);

            // Status updates for verif-icon-btn buttons are handled above.

            taskItem.dataset.doc = doc ? 'true' : 'false';
            taskItem.dataset.code = code ? 'true' : 'false';
            taskItem.dataset.test = test ? 'true' : 'false';
        }

        function updateAllDependencyBadges() {
            document.querySelectorAll('#roadmap-view .task-item').forEach(taskItem => {
                const depBlock = taskItem.querySelector('.dependency-block');
                if (!depBlock) return;
                const taskId = taskItem.getAttribute('data-task-id');
                const taskDef = Object.values(taskDefinitions).flat().find(t => t.id === taskId);
                if (taskDef && taskDef.dependency) {
                    const depTaskEl = document.querySelector(`[data-task-id="${taskDef.dependency}"]`);
                    const isDepDone = depTaskEl && depTaskEl.getAttribute('data-state') === 'done';
                    const depBadge = depBlock.querySelector('.dep-badge');
                    if (depBadge) {
                        if (isDepDone) {
                            depBadge.innerText = 'Resolved';
                            depBadge.className = 'px-1.5 py-0.5 rounded font-bold uppercase dep-badge text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                        } else {
                            depBadge.innerText = 'Blocking';
                            depBadge.className = 'px-1.5 py-0.5 rounded font-bold uppercase dep-badge text-[9px] bg-red-500/10 text-red-400 border border-red-500/20';
                        }
                    }
                }
            });
        }

        window.toggleTaskInfo = function (taskId) {
            const panel = document.getElementById(taskId + '-info-panel');
            const chevron = document.getElementById(taskId + '-chevron');
            if (panel && chevron) {
                const isHidden = panel.classList.contains('hidden');
                if (isHidden) {
                    panel.classList.remove('hidden');
                    chevron.style.transform = 'rotate(90deg)';
                } else {
                    panel.classList.add('hidden');
                    chevron.style.transform = 'rotate(0deg)';
                }
            }
        };

        const sprintDefinitions = {
            "p0": [
                { id: "p0-s0", code: "SPRINT 0", text: "Feasibility Spike", duration: "1 week" }
            ],
            "p1": [
                { id: "p1-s1a", code: "SPRINT 1A", text: "WebSocket & Core Architecture", duration: "2 weeks" },
                { id: "p1-s1b", code: "SPRINT 1B", text: "YouTube IFrame & Queue Playback", duration: "2 weeks" }
            ],
            "p2": [
                { id: "p2-s2a", code: "SPRINT 2A", text: "Sync Hardening", duration: "1.5 weeks" },
                { id: "p2-s2b", code: "SPRINT 2B", text: "Rider & Passenger UX", duration: "1.5 weeks" }
            ],
            "p3": [
                { id: "p3-s3a", code: "SPRINT 3A", text: "Recruitment & Beta Release", duration: "1 week" },
                { id: "p3-s3b", code: "SPRINT 3B", text: "Analytics & Metrics Feedback", duration: "1 week" }
            ],
            "p4": [
                { id: "p4-task", code: "BACKLOG", text: "Future Backlog Items", duration: "Future" }
            ]
        };

        function initRoadmapList() {
            const savedStates = loadState();
            Object.keys(taskDefinitions).forEach(phaseKey => {
                const phaseEl = document.getElementById(phaseKey);
                if (!phaseEl) return;
                const container = phaseEl.querySelector('.tasks');
                if (!container) return;
                container.innerHTML = '';

                // Render Sprints inside phase body
                const sprints = sprintDefinitions[phaseKey] || [];
                const sprintContainers = {};

                sprints.forEach(sprint => {
                    const sprintDiv = document.createElement('div');
                    sprintDiv.className = "sprint-block bg-white/5 border border-white/5 rounded-xl p-4 mb-4";
                    sprintDiv.id = sprint.id;
                    sprintDiv.innerHTML = `
                        <div class="flex items-center justify-between mb-3 text-xs select-none">
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded border border-white/10 bg-white/5 text-stone-300 font-mono font-bold">${sprint.code}</span>
                                <span class="font-bold text-white font-sans">${sprint.text}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-cyber-muted font-mono font-bold text-[9px]">Duration: ${sprint.duration}</span>
                                <span class="sprint-progress px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 font-mono font-bold" id="${sprint.id}-progress">0%</span>
                            </div>
                        </div>
                        <div class="sprint-tasks space-y-3"></div>
                    `;
                    container.appendChild(sprintDiv);
                    sprintContainers[sprint.id] = sprintDiv.querySelector('.sprint-tasks');
                });

                taskDefinitions[phaseKey].forEach(task => {
                    const taskItem = document.createElement('div');
                    taskItem.className = "task-item p-3.5 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl flex flex-col gap-1.5 transition-all duration-300 cursor-pointer";
                    taskItem.setAttribute('data-task-id', task.id);
                    taskItem.setAttribute('data-task-type', task.type || '');

                    const complexityColors = {
                        extream: 'bg-red-500/10 text-red-400 border border-red-500/20',
                        high: 'bg-orange-500/10 text-orange-400 border border-orange-500/20',
                        nomal: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                        low: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                        less: 'bg-white/5 text-stone-400 border border-white/10'
                    };
                    const compClass = complexityColors[task.complexity] || 'bg-white/5 text-stone-300 border border-white/10';

                    let depHtml = '';
                    if (task.dependency) {
                        const depTask = Object.values(taskDefinitions).flat().find(t => t.id === task.dependency);
                        const depCode = depTask ? (depTask.code || depTask.id) : task.dependency;
                        const depText = depTask ? depTask.text : 'Unknown Task';
                        depHtml = `
                            <div class="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5 dependency-block">
                                <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider">Dependency:</span>
                                <div class="flex items-center gap-2 font-mono text-[11px]">
                                    <span class="px-1.5 py-0.5 rounded font-bold uppercase dep-badge text-[9px] bg-red-500/10 text-red-400 border border-red-500/20">Blocking</span>
                                    <span class="text-stone-300">Depends on: <span class="text-indigo-400 font-bold">${depCode}</span> - ${depText}</span>
                                </div>
                            </div>
                        `;
                    }

                    const changelogHtml = (() => {
                        const detail = task.changelog || 'No recent changes logged.';
                        const parts = detail.split(';').map(p => p.trim()).filter(Boolean);
                        const versionPrefix = `[${task.version || '1.0.0'}] - `;
                        const indentSpaces = '&nbsp;'.repeat(versionPrefix.length);

                        let formattedText = `${versionPrefix}${parts[0]}${parts.length > 1 ? ';' : ''}`;
                        for (let i = 1; i < parts.length; i++) {
                            const isLast = i === parts.length - 1;
                            const suffix = (!isLast || detail.endsWith(';')) ? ';' : '';
                            formattedText += `<br>${indentSpaces}${parts[i]}${suffix}`;
                        }
                        formattedText += `<br>${indentSpaces}[Updated: ${task.last_update || 'N/A'}]`;
                        return formattedText;
                    })();

                    taskItem.innerHTML = `
                        <div class="flex items-center justify-between gap-4 w-full">
                            <div class="flex items-start gap-3 min-w-0 flex-1">
                                <span class="task-status-indicator shrink-0 mt-0.5"></span>
                                <button class="info-toggle-btn text-cyber-muted hover:text-white transition-colors shrink-0 mt-0.5" onclick="event.stopPropagation(); toggleTaskInfo('${task.id}')">
                                    <i class="fa-solid fa-chevron-right info-chevron text-[10px] transition-transform duration-200" id="${task.id}-chevron"></i>
                                </button>
                                <div class="flex flex-col gap-1.5 min-w-0 flex-1">
                                    <div class="flex items-center gap-3 min-w-0">
                                        <span class="text-sm font-semibold truncate text-white leading-none">${task.text}</span>
                                    </div>
                                    <div class="flex items-center gap-2 flex-wrap" onclick="event.stopPropagation()">
                                        <span class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${task.type === 'FR' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'} shrink-0">${task.type}</span>
                                        <span class="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold capitalize ${compClass} shrink-0">${task.complexity}</span>
                                        <button class="verif-icon-btn doc-btn" title="Doc Check"><i class="fa-solid fa-file-invoice"></i></button>
                                        <button class="verif-icon-btn code-btn" title="Code Check"><i class="fa-solid fa-code"></i></button>
                                        <button class="verif-icon-btn test-btn" title="Test Check"><i class="fa-solid fa-flask"></i></button>
                                    </div>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0" onclick="event.stopPropagation()">
                                <span class="text-[10px] text-cyber-muted font-bold font-mono uppercase assign-lbl">Assign To:</span>
                                <select class="assist-to-select bg-black/40 border border-cyber-border rounded px-1.5 py-0.5 text-xs text-white focus:outline-none" onchange="saveStateToStorage()">
                                    <option value="none">Unassigned</option>
                                    <option value="eva">EVA Agent (Gemini 3.5 Flash)</option>
                                    <option value="qwen">Qwen Coder (Qwen2.5-Coder)</option>
                                    <option value="uat">UAT Agent (GPT-4o)</option>
                                    <option value="local">Local Dev (Human)</option>
                                </select>
                                <span class="completed-by-lbl text-xs text-emerald-400 font-bold hidden"></span>
                            </div>
                        </div>
                        <div class="task-info-panel mt-3 pt-3 border-t border-white/5 text-xs text-cyber-muted space-y-3 hidden w-full" id="${task.id}-info-panel" onclick="event.stopPropagation()">
                            <div class="flex justify-between items-center border-b border-white/5 pb-2">
                                <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider">Symbol Links</span>
                                <span class="not-impl-badge px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">Not Implement</span>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-white/5 pb-3">
                                <div class="flex flex-col gap-1">
                                    <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider">Code Link:</span>
                                    <a href="file:///${task.codeLink || task.symbolLink || 'src/App.tsx'}" class="text-indigo-400 hover:underline font-mono break-all text-[11px]">${task.codeLink || task.symbolLink || 'src/App.tsx'}</a>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider">Doc Link:</span>
                                    <a href="file:///${task.docLink || (phaseKey === 'p0' ? 'docs/compatibility_report.md' : 'GEMINI.md')}" class="text-indigo-400 hover:underline font-mono break-all text-[11px]">${task.docLink || (phaseKey === 'p0' ? 'docs/compatibility_report.md' : 'GEMINI.md')}</a>
                                </div>
                                <div class="flex flex-col gap-1">
                                    <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider">Test Link:</span>
                                    <a href="file:///${task.testLink || (task.id.includes('server') ? 'server/index.js' : 'tests/sync.test.js')}" class="text-indigo-400 hover:underline font-mono break-all text-[11px]">${task.testLink || (task.id.includes('server') ? 'server/index.js' : 'tests/sync.test.js')}</a>
                                </div>
                            </div>
                            <div class="grid grid-cols-5 gap-4">
                                <div>
                                    <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider block mb-1">Version:</span>
                                    <span class="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-[10px] text-stone-300 font-bold">${task.version || '1.0.0'}</span>
                                </div>
                                <div>
                                    <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider block mb-1">Complexity:</span>
                                    <span class="px-2 py-0.5 rounded font-mono text-[10px] capitalize ${compClass}">${task.complexity}</span>
                                </div>
                                <div>
                                    <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider block mb-1">Type:</span>
                                    <span class="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-[10px] uppercase text-stone-300">${task.type}</span>
                                </div>
                                <div>
                                    <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider block mb-1">Status:</span>
                                    <span class="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-[10px] text-stone-300">${task.status || 'draft'}</span>
                                </div>
                                <div>
                                    <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider block mb-1">Tokens Used:</span>
                                    <span class="px-2 py-0.5 rounded bg-white/5 border border-white/5 font-mono text-[10px] text-stone-300 font-bold">${task.tokensUsed ? task.tokensUsed.toLocaleString() : '0'}</span>
                                </div>
                            </div>
                            <div class="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5">
                                <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider">Definition of Done (DoD):</span>
                                <div class="grid grid-cols-3 gap-4 text-[10px] text-stone-300 font-mono">
                                    <div class="flex flex-col gap-1.5">
                                        <span class="font-bold text-emerald-400 text-[9px] uppercase tracking-wider">Acceptance Criteria</span>
                                        <label class="flex items-center gap-1.5">
                                            <input type="checkbox" class="dod-doc-check-1 rounded bg-black/40 border border-cyber-border focus:ring-0 text-emerald-500 w-3 h-3 pointer-events-none" disabled />
                                            <span>Spec approved</span>
                                        </label>
                                        <label class="flex items-center gap-1.5">
                                            <input type="checkbox" class="dod-doc-check-2 rounded bg-black/40 border border-cyber-border focus:ring-0 text-emerald-500 w-3 h-3 pointer-events-none" disabled />
                                            <span>Docs updated</span>
                                        </label>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <span class="font-bold text-emerald-400 text-[9px] uppercase tracking-wider">Success Criteria</span>
                                        <label class="flex items-center gap-1.5">
                                            <input type="checkbox" class="dod-code-check-1 rounded bg-black/40 border border-cyber-border focus:ring-0 text-emerald-500 w-3 h-3 pointer-events-none" disabled />
                                            <span>Code complete</span>
                                        </label>
                                        <label class="flex items-center gap-1.5">
                                            <input type="checkbox" class="dod-code-check-2 rounded bg-black/40 border border-cyber-border focus:ring-0 text-emerald-500 w-3 h-3 pointer-events-none" disabled />
                                            <span>Lints clean</span>
                                        </label>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <span class="font-bold text-emerald-400 text-[9px] uppercase tracking-wider">Exit Criteria</span>
                                        <label class="flex items-center gap-1.5">
                                            <input type="checkbox" class="dod-test-check-1 rounded bg-black/40 border border-cyber-border focus:ring-0 text-emerald-500 w-3 h-3 pointer-events-none" disabled />
                                            <span>Tests passed</span>
                                        </label>
                                        <label class="flex items-center gap-1.5">
                                            <input type="checkbox" class="dod-test-check-2 rounded bg-black/40 border border-cyber-border focus:ring-0 text-emerald-500 w-3 h-3 pointer-events-none" disabled />
                                            <span>Regression free</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                            ${depHtml}
                            <div class="mt-3 pt-3 border-t border-white/5 flex flex-col gap-1.5">
                                <span class="font-bold text-white font-mono text-[10px] uppercase tracking-wider">Changelog:</span>
                                <div class="bg-black/80 border border-emerald-500/20 p-2.5 rounded-lg font-mono text-[11px] text-emerald-400 leading-relaxed shadow-inner">
                                    ${changelogHtml}
                                </div>
                            </div>
                            <div class="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-cyber-muted font-mono">
                                <div>
                                    <div>Created: ${task.created_at || 'N/A'}</div>
                                    <div class="mt-1 font-bold text-white uppercase text-[9px] tracking-wider">Task ID: <span class="text-indigo-400">${task.code || task.id}</span></div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bold text-white uppercase text-[9px] tracking-wider">Export Task:</span>
                                    <button onclick="event.stopPropagation(); exportData('task', 'json', '${task.id}')" class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-stone-300 hover:text-white transition-all text-[9px] font-bold">JSON</button>
                                    <button onclick="event.stopPropagation(); exportData('task', 'yaml', '${task.id}')" class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-stone-300 hover:text-white transition-all text-[9px] font-bold">YAML</button>
                                    <button onclick="event.stopPropagation(); exportData('task', 'md', '${task.id}')" class="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 text-stone-300 hover:text-white transition-all text-[9px] font-bold">Markdown</button>
                                </div>
                            </div>
                        </div>
                    `;

                    // Bind checkbox handlers
                    const docBtn = taskItem.querySelector('.doc-btn');
                    const codeBtn = taskItem.querySelector('.code-btn');
                    const testBtn = taskItem.querySelector('.test-btn');
                    const selectEl = taskItem.querySelector('.assist-to-select');

                    const taskState = savedStates[task.id] || { doc: false, code: false, test: false, assignee: 'none' };
                    setTaskItemState(taskItem, taskState);
                    if (selectEl) selectEl.value = taskState.assignee;

                    docBtn.addEventListener('click', () => {
                        const currentDoc = taskItem.dataset.doc === 'true';
                        setTaskItemState(taskItem, { doc: !currentDoc, code: false, test: false, assignee: selectEl.value });
                        saveStateToStorage();
                        calculateRoadmapProgress();
                        updateAllDependencyBadges();
                    });

                    codeBtn.addEventListener('click', () => {
                        if (taskItem.dataset.doc !== 'true') return;
                        const currentCode = taskItem.dataset.code === 'true';
                        setTaskItemState(taskItem, { doc: true, code: !currentCode, test: false, assignee: selectEl.value });
                        saveStateToStorage();
                        calculateRoadmapProgress();
                        updateAllDependencyBadges();
                    });

                    testBtn.addEventListener('click', () => {
                        if (taskItem.dataset.code !== 'true') return;
                        const currentTest = taskItem.dataset.test === 'true';
                        setTaskItemState(taskItem, { doc: true, code: true, test: !currentTest, assignee: selectEl.value });
                        saveStateToStorage();
                        calculateRoadmapProgress();
                        updateAllDependencyBadges();
                    });

                    taskItem.addEventListener('click', () => {
                        const status = taskItem.getAttribute('data-state');
                        if (status === 'done' || status === 'pending') return;

                        if (!socket || socket.readyState !== WebSocket.OPEN) {
                            alert("Cannot run task. Back-end WebSocket is offline. Make sure port 8787 is listening.");
                            return;
                        }
                        activeTaskId = task.id;
                        setTaskItemState(taskItem, { doc: true, code: false, test: false, assignee: selectEl ? selectEl.value : 'none' });
                        saveStateToStorage();
                        calculateRoadmapProgress();
                        updateAllDependencyBadges();

                        socket.send(JSON.stringify({
                            type: 'run_agent_task',
                            taskId: task.id,
                            taskText: task.text,
                            agent: selectEl ? selectEl.value : 'none',
                            system_prompt: document.getElementById('system-prompt') ? document.getElementById('system-prompt').value : '',
                            workspace_path: document.getElementById('workspace-path') ? document.getElementById('workspace-path').value : ''
                        }));
                    });

                    // Drag & Drop event listeners
                    taskItem.addEventListener('dragover', (e) => {
                        e.preventDefault();
                    });

                    taskItem.addEventListener('dragenter', (e) => {
                        e.preventDefault();
                        taskItem.classList.add('border-emerald-500/50', 'bg-emerald-500/5', 'scale-[1.01]');
                    });

                    taskItem.addEventListener('dragleave', () => {
                        taskItem.classList.remove('border-emerald-500/50', 'bg-emerald-500/5', 'scale-[1.01]');
                    });

                    taskItem.addEventListener('drop', (e) => {
                        e.preventDefault();
                        taskItem.classList.remove('border-emerald-500/50', 'bg-emerald-500/5', 'scale-[1.01]');
                        const agentId = e.dataTransfer.getData('text/plain');
                        if (agentId) {
                            const selectEl = taskItem.querySelector('.assist-to-select');
                            if (selectEl) {
                                selectEl.value = agentId;
                                saveStateToStorage();
                                calculateRoadmapProgress();
                                logTerminal('sys', `Assigned agent '${agentId}' to task: "${task.text}"`);
                            }
                        }
                    });

                    // Find matching sprint
                    let matchedSprintId = null;
                    sprints.forEach(sprint => {
                        if (task.id.startsWith(sprint.id)) {
                            matchedSprintId = sprint.id;
                        }
                    });

                    const targetSubContainer = matchedSprintId ? sprintContainers[matchedSprintId] : container;
                    targetSubContainer.appendChild(taskItem);
                });
            });
            calculateRoadmapProgress();
            updateAllDependencyBadges();
        }

        function calculateRoadmapProgress() {
            const featureTasks = document.querySelectorAll('#roadmap-view .task-item[data-task-type="FR"]');
            let totalFeatures = featureTasks.length, readyFeatures = 0;
            featureTasks.forEach(t => {
                if (t.getAttribute('data-state') === 'done') readyFeatures++;
            });
            const backlogTasks = document.querySelectorAll('#p4 .task-item');
            let backlogPending = 0;
            backlogTasks.forEach(t => {
                if (t.getAttribute('data-state') !== 'done') backlogPending++;
            });
            const pct = totalFeatures > 0 ? Math.round((readyFeatures / totalFeatures) * 100) : 0;

            const pctText = document.getElementById('global-percent-text');
            const pctFill = document.getElementById('global-progress-fill');
            if (pctText) pctText.innerText = pct + '%';
            if (pctFill) pctFill.style.width = pct + '%';

            // Update roadmap feature stats
            const statsTotal = document.getElementById('stats-total-tasks');
            const statsCompleted = document.getElementById('stats-completed-tasks');
            const statsPending = document.getElementById('stats-pending-tasks');
            if (statsTotal) statsTotal.innerText = totalFeatures;
            if (statsCompleted) statsCompleted.innerText = readyFeatures;
            if (statsPending) statsPending.innerText = backlogPending;

            // Phase percentages
            ['p0', 'p1', 'p2', 'p3', 'p4'].forEach(id => {
                const phaseEl = document.getElementById(id);
                if (!phaseEl) return;
                const tasks = phaseEl.querySelectorAll('.task-item');
                let pTotal = tasks.length, pDone = 0;
                tasks.forEach(t => {
                    if (t.getAttribute('data-state') === 'done') pDone++;
                });
                const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;
                const lbl = document.getElementById(id + '-progress-lbl');
                const fill = document.getElementById(id + '-mini-fill');
                if (lbl) lbl.innerText = pPct + '%';
                if (fill) fill.style.width = pPct + '%';

                // Sprint percentages
                const sprintBlocks = phaseEl.querySelectorAll('.sprint-block');
                sprintBlocks.forEach(sprintBlock => {
                    const sId = sprintBlock.id;
                    const sTasks = sprintBlock.querySelectorAll('.task-item');
                    let sTotal = sTasks.length, sDone = 0;
                    sTasks.forEach(t => {
                        if (t.getAttribute('data-state') === 'done') sDone++;
                    });
                    const sPct = sTotal > 0 ? Math.round((sDone / sTotal) * 100) : 0;
                    const sProgress = document.getElementById(sId + '-progress');
                    if (sProgress) sProgress.innerText = sPct + '%';
                });
            });
        }


        // --- AST Tree Lines drawing ---
        function updateEdges() {
            if (document.getElementById('view-B1').classList.contains('hidden')) return;
            drawSvgLine('node-start', 'node-agent', 'edge-1');
            drawSvgLine('node-agent', 'node-hitl', 'edge-2');
            drawSvgLine('node-hitl', 'node-end', 'edge-3');
        }

        function drawSvgLine(fromId, toId, pathId) {
            const from = document.getElementById(fromId);
            const to = document.getElementById(toId);
            const path = document.getElementById(pathId);
            const container = document.getElementById('ast-canvas-container');
            if (!from || !to || !path || !container) return;

            const cRect = container.getBoundingClientRect();
            const fRect = from.getBoundingClientRect();
            const tRect = to.getBoundingClientRect();

            const startX = fRect.right - cRect.left;
            const startY = fRect.top + (fRect.height / 2) - cRect.top;
            const endX = tRect.left - cRect.left;
            const endY = tRect.top + (tRect.height / 2) - cRect.top;

            const dist = Math.max(50, Math.abs(endX - startX) * 0.6);
            path.setAttribute('d', `M ${startX} ${startY} C ${startX + dist} ${startY}, ${endX - dist} ${endY}, ${endX} ${endY}`);
        }

        function highlightCodeLine(lineId) {
            document.querySelectorAll('.line-code').forEach(el => el.classList.remove('highlighted'));
            const activeLine = document.getElementById(lineId);
            if (activeLine) activeLine.classList.add('highlighted');
        }

        // AST Traversal Flow Runner
        function startWorkflow() {
            switchDomain('B');
            setTimeout(() => {
                switchMainView('B1');
                document.getElementById('agent-spinner').classList.remove('hidden');
                document.getElementById('node-agent-status').innerText = 'Analyzing...';
                document.getElementById('node-agent').classList.add('active-node');
                logTerminal('sys', 'Initializing AST Parser for calculateDrift.js...');

                setTimeout(() => {
                    document.getElementById('agent-spinner').classList.add('hidden');
                    document.getElementById('node-agent-status').innerText = 'Traversed';
                    document.getElementById('node-agent').classList.remove('active-node');
                    document.getElementById('edge-2').setAttribute('class', 'edge-path active');

                    setTimeout(() => {
                        document.getElementById('edge-2').setAttribute('class', 'edge-path');
                        const modal = document.getElementById('hitl-modal');
                        const card = document.getElementById('hitl-card');
                        modal.classList.remove('opacity-0', 'pointer-events-none');
                        card.classList.remove('translate-y-4');
                    }, 1000);
                }, 1500);
            }, 200);
        }

        function resolveHitl(approved) {
            const modal = document.getElementById('hitl-modal');
            const card = document.getElementById('hitl-card');
            modal.classList.add('opacity-0', 'pointer-events-none');
            card.classList.add('translate-y-4');

            if (approved) {
                logTerminal('sys', 'Human Verification approved. Continuing compilation...');
                document.getElementById('node-hitl-status').innerText = 'Approved';
                document.getElementById('node-hitl-status').className = 'block text-[10px] text-emerald-400';
                document.getElementById('edge-3').setAttribute('class', 'edge-path active');

                setTimeout(() => {
                    document.getElementById('edge-3').setAttribute('class', 'edge-path');
                    document.getElementById('node-end').classList.add('active-node');
                    logTerminal('sys', 'AST Traversal and code assembly verified successfully!');
                }, 1000);
            } else {
                logTerminal('warn', 'AST Evaluation rejected by supervisor.');
                document.getElementById('node-hitl-status').innerText = 'Rejected';
                document.getElementById('node-hitl-status').className = 'block text-[10px] text-red-500';
            }
        }

        // --- Call Graph Visualizer (Cytoscape.js) ---
        let cyInstance = null;
        function initCallGraph() {
            const container = document.getElementById('cy-container');
            if (!container) return;

            cyInstance = cytoscape({
                container: container,
                elements: [
                    { data: { id: 'pkg-ui', label: 'apps/web', type: 'package', color: '#10b981' } },
                    { data: { id: 'pkg-gks', label: 'packages/gks', type: 'package', color: '#6366f1' } },
                    { data: { id: 'App', label: 'App.tsx', parent: 'pkg-ui' } },
                    { data: { id: 'Socket', label: 'socket.js', parent: 'pkg-ui' } },
                    { data: { id: 'drift', label: 'calculateDrift', parent: 'pkg-gks' } },
                    { data: { id: 'App', target: 'Socket' } },
                    { data: { id: 'Socket', target: 'drift' } }
                ],
                style: [
                    {
                        selector: 'node',
                        style: {
                            'label': 'data(label)',
                            'color': '#fff',
                            'background-color': '#1f2937',
                            'border-width': 1,
                            'border-color': '#4b5563',
                            'font-size': '11px',
                            'text-valign': 'center',
                            'width': '100px',
                            'height': '35px',
                            'shape': 'round-rectangle'
                        }
                    },
                    {
                        selector: 'node:parent',
                        style: {
                            'label': 'data(label)',
                            'text-valign': 'top',
                            'background-opacity': 0.05,
                            'background-color': 'data(color)',
                            'border-color': 'data(color)',
                            'border-style': 'dashed'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': '#4b5563',
                            'target-arrow-shape': 'triangle',
                            'target-arrow-color': '#4b5563',
                            'curve-style': 'bezier'
                        }
                    }
                ],
                layout: { name: 'cose', padding: 20 }
            });

            cyInstance.on('tap', 'node', function (evt) {
                const node = evt.target;
                if (node.isParent()) return;
                document.getElementById('node-name').innerText = node.data('label');
                document.getElementById('node-type').innerText = 'Function / Block';
                document.getElementById('node-file').innerText = 'src/' + node.data('label').toLowerCase();
            });
        }

        function refreshCallGraph() {
            const syncIcon = document.getElementById('sync-icon');
            if (syncIcon) syncIcon.classList.add('fa-spin');
            logTerminal('sys', 'Refreshing call graphs indexes using Tree-sitter analyzer...');
            setTimeout(() => {
                if (syncIcon) syncIcon.classList.remove('fa-spin');
                if (cyInstance) cyInstance.layout({ name: 'cose' }).run();
                logTerminal('sys', 'Dependency Call graph synced successfully.');
            }, 1200);
        }

        // --- Database schema ERD dragging ---
        function updateErdEdges() {
            if (document.getElementById('view-C4').classList.contains('hidden')) return;
            const from = document.getElementById('tbl-rooms');
            const to = document.getElementById('tbl-telemetry');
            const path = document.getElementById('erd-edge-1');
            const container = document.getElementById('erd-canvas-container');
            if (!from || !to || !path || !container) return;

            const cRect = container.getBoundingClientRect();
            const fRect = from.getBoundingClientRect();
            const tRect = to.getBoundingClientRect();

            const startX = fRect.right - cRect.left;
            const startY = fRect.top + (fRect.height / 2) - cRect.top;
            const endX = tRect.left - cRect.left;
            const endY = tRect.top + (tRect.height / 2) - cRect.top;

            const dist = Math.max(50, Math.abs(endX - startX) * 0.6);
            path.setAttribute('d', `M ${startX} ${startY} C ${startX + dist} ${startY}, ${endX - dist} ${endY}, ${endX} ${endY}`);
            path.setAttribute('class', 'edge-path active');
        }

        // Drag handlers for DOM elements
        function setupDraggableNodes() {
            const dragNodes = document.querySelectorAll('.sidebar-glass, #ast-canvas-container div, #erd-canvas-container .db-table-card');
            dragNodes.forEach(node => {
                if (node.classList.contains('sidebar-glass') || node.id === 'canvas-container') return;
                node.addEventListener('mousedown', (e) => {
                    const container = node.parentElement;
                    let shiftX = e.clientX - node.getBoundingClientRect().left;
                    let shiftY = e.clientY - node.getBoundingClientRect().top;

                    function moveAt(pageX, pageY) {
                        const rect = container.getBoundingClientRect();
                        let left = pageX - rect.left - shiftX;
                        let top = pageY - rect.top - shiftY;

                        left = Math.max(0, Math.min(left, rect.width - node.offsetWidth));
                        top = Math.max(0, Math.min(top, rect.height - node.offsetHeight));

                        node.style.left = left + 'px';
                        node.style.top = top + 'px';
                        updateEdges();
                        updateErdEdges();
                    }

                    function onMouseMove(event) { moveAt(event.clientX, event.clientY); }
                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', () => {
                        document.removeEventListener('mousemove', onMouseMove);
                    }, { once: true });
                });
            });
        }

        // --- HNSW Space layers filter ---
        const hnswMockLayers = {
            6: ['Hot Kitchen Zone', 'Cold Bar Zone'],
            4: ['ครัวต้มแกง', 'ครัวผัดทอด', 'สถานีเครื่องดื่ม'],
            2: ['ราวแขวนเครื่องครัว', 'ตู้แช่เย็นหลัก', 'ตู้ปั่นน้ำแข็ง'],
            0: ['[หม้อต้ม]', '[กะทะจีน]', '[เครื่องผสม]', '[แก้วปั่น]']
        };

        function selectHNSWLayer(layer, btnElement) {
            document.querySelectorAll('.hnsw-layer-btn').forEach(btn => {
                btn.className = "w-full p-2 rounded text-left bg-white/5 text-gray-300 hover:bg-white/10 hnsw-layer-btn";
            });
            if (btnElement) {
                btnElement.className = "w-full p-2 rounded text-left bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold hnsw-layer-btn";
            }
            const container = document.getElementById('hnsw-layer-visual-container');
            const visualTitle = document.getElementById('hnsw-visual-layer-title');
            if (!container || !visualTitle) return;

            container.innerHTML = '';
            visualTitle.innerText = `Active: Layer ${layer} Expressway`;

            hnswMockLayers[layer].forEach(item => {
                const node = document.createElement('div');
                node.className = "px-4 py-2 bg-cyan-900/30 border border-cyan-500/50 rounded-xl text-white font-mono text-sm animate-pulse";
                node.innerText = item;
                container.appendChild(node);
            });
        }

        // --- Sound Generator Oscilloscope sandbox (Web Audio API) ---
        let audioCtx = null;
        let analyser = null;
        let isPlaying = false;
        let synthInterval = null;
        let volume = 0.4;
        const melodyNotes = [
            { name: "C4", freq: 261.63 },
            { name: "E4", freq: 329.63 },
            { name: "G4", freq: 392.00 },
            { name: "C5", freq: 523.25 }
        ];

        function toggleAudioPlayback() {
            isPlaying ? stopSynthesizer() : startSynthesizer();
        }

        function startSynthesizer() {
            if (!audioCtx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContextClass();
                analyser = audioCtx.createAnalyser();
            }
            if (audioCtx.state === 'suspended') audioCtx.resume();
            isPlaying = true;

            const btnText = document.getElementById('playback-btn-text');
            const btnIcon = document.getElementById('playback-btn-icon');
            if (btnText) btnText.innerText = 'หยุดจำลองเสียง';
            if (btnIcon) btnIcon.className = "fa-solid fa-pause";

            const standby = document.getElementById('canvas-standby-overlay');
            if (standby) standby.classList.add('hidden');

            let noteIdx = 0;
            synthInterval = setInterval(() => {
                if (!audioCtx) return;
                const note = melodyNotes[noteIdx];
                const noteText = document.getElementById('active-note-text');
                if (noteText) noteText.innerText = note.name;

                const osc = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(note.freq, audioCtx.currentTime);
                gainNode.gain.setValueAtTime(volume * 0.15, audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

                osc.connect(gainNode);
                gainNode.connect(analyser);
                analyser.connect(audioCtx.destination);

                osc.start();
                osc.stop(audioCtx.currentTime + 0.45);
                noteIdx = (noteIdx + 1) % melodyNotes.length;
            }, 500);
        }

        function stopSynthesizer() {
            isPlaying = false;
            const btnText = document.getElementById('playback-btn-text');
            const btnIcon = document.getElementById('playback-btn-icon');
            if (btnText) btnText.innerText = 'Play / จำลองเสียง';
            if (btnIcon) btnIcon.className = "fa-solid fa-play";

            const standby = document.getElementById('canvas-standby-overlay');
            if (standby) standby.classList.remove('hidden');

            if (synthInterval) clearInterval(synthInterval);
        }

        function updateAudioVolume(val) {
            volume = parseFloat(val);
            const lbl = document.getElementById('volume-label-text');
            if (lbl) lbl.innerText = `${Math.round(volume * 100)}%`;
        }

        let angle = 0;
        function drawOscilloscope() {
            const canvas = document.getElementById('oscilloscope-canvas');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width;
            const height = canvas.height;

            let dataArray = new Uint8Array(128);
            if (isPlaying && analyser) {
                analyser.getByteTimeDomainData(dataArray);
            } else {
                for (let i = 0; i < 128; i++) {
                    dataArray[i] = 128 + Math.sin(i * 0.15 + angle) * 20;
                }
            }

            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            const sliceWidth = width / dataArray.length;
            let x = 0;
            for (let i = 0; i < dataArray.length; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * height) / 2;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.lineTo(width, height / 2);
            ctx.stroke();

            angle += 0.1;
            requestAnimationFrame(drawOscilloscope);
        }

        // --- Simulated Heatmap Core values (D2) ---
        function initHeatmapGrid() {
            const grid = document.getElementById('heatmap-grid-container');
            if (!grid) return;
            grid.innerHTML = '';
            for (let i = 0; i < 64; i++) {
                const node = document.createElement('div');
                node.className = "h-8 rounded flex items-center justify-center font-mono text-[10px] font-bold text-black transition-all duration-500 bg-blue-500/40 border border-blue-500/20";
                node.id = `temp-grid-${i}`;
                grid.appendChild(node);
            }
            randomizeHeatmapValues();
        }

        function randomizeHeatmapValues() {
            for (let i = 0; i < 64; i++) {
                const temp = Math.floor(Math.random() * 45) + 30;
                const node = document.getElementById(`temp-grid-${i}`);
                if (!node) continue;

                node.innerText = `${temp}°`;
                if (temp < 45) {
                    node.className = "h-8 rounded flex items-center justify-center font-mono text-[10px] font-bold text-white bg-blue-500/40 border border-blue-500/20";
                } else if (temp < 60) {
                    node.className = "h-8 rounded flex items-center justify-center font-mono text-[10px] font-bold text-black bg-amber-500/60 border border-amber-500/20";
                } else {
                    node.className = "h-8 rounded flex items-center justify-center font-mono text-[10px] font-bold text-white bg-red-600/80 border border-red-500/40 animate-pulse";
                }
            }
            const coreVal = document.getElementById('core-temp-val');
            if (coreVal) {
                const coreTemp = Math.floor(Math.random() * 15) + 40;
                coreVal.innerText = `${coreTemp}.4 °C`;
                updateLiveHardwareSample({ GPU_Temp: coreTemp });
            }
        }

        // --- Reactor Safety execution simulation ---
        function triggerSafetyReactorRun(btn) {
            if (!btn) return;
            btn.disabled = true;
            btn.innerText = "RUNNING SAFETY COMPLIANCE RUN...";

            const progress = document.getElementById('progress-safety-run');
            if (progress) progress.style.width = '0%';

            let width = 0;
            const interval = setInterval(() => {
                width += 10;
                if (progress) progress.style.width = `${width}%`;
                if (width >= 100) {
                    clearInterval(interval);
                    btn.disabled = false;
                    btn.innerText = "START SAFETY CAMPAIGN RUN";
                    alert("EABS-01 compliance checks passed under standard thresholds!");
                }
            }, 150);
        }

        // --- Terminal Logs Panel ---
        const term = document.getElementById('terminal-output');
        function logTerminal(type, text) {
            if (!term) return;
            const line = document.createElement('div');
            line.className = 'mb-1.5 flex gap-2 text-xs font-mono';
            const time = new Date().toLocaleTimeString('en-US', { hour12: false });

            let tag = '';
            if (type === 'sys') tag = `<span class="text-[#5fb1ad] shrink-0 font-bold">[SYS]</span>`;
            else if (type === 'eva') tag = `<span class="text-emerald-400 shrink-0 font-bold">[EVA]</span>`;
            else if (type === 'warn') tag = `<span class="text-yellow-500 shrink-0 font-bold">[WRN]</span>`;
            else if (type === 'user') tag = `<span class="text-blue-400 shrink-0 font-bold">[USER]</span>`;

            line.innerHTML = `<span class="text-gray-500 shrink-0">[${time}]</span> ${tag} <span class="text-stone-300">${text}</span>`;
            term.appendChild(line);
            term.scrollTop = term.scrollHeight;
        }

        function handleTerminalInput(e) {
            if (e.key === 'Enter') {
                const input = document.getElementById('terminal-input');
                const val = input.value.trim();
                if (val) {
                    logTerminal('user', val);
                    input.value = '';
                    setTimeout(() => {
                        logTerminal('sys', `Command '${val}' queued for remote WebSocket node execution.`);
                    }, 500);
                }
            }
        }

        function toggleTerminal() {
            const panel = document.getElementById('floating-terminal');
            if (panel) panel.classList.toggle('expanded');
        }

        // Live hardware status limits
        function updateLiveHardwareSample(sample) {
            const temp = sample.GPU_Temp || 35;
            updateThermalMarginDisplay(temp);
        }

        function updateThermalMarginDisplay(gpuTemp) {
            const limit = Number(localStorage.getItem('thermal-alert-limit') || '71');
            const margin = limit - gpuTemp;
            const thermalEl = document.getElementById('tel-thermal');
            const container = document.getElementById('tel-thermal-container');
            if (thermalEl && container) {
                thermalEl.innerText = `${margin >= 0 ? '+' : ''}${margin.toFixed(1)}°C`;
                if (margin <= 5) {
                    thermalEl.className = "font-bold font-mono text-red-500 animate-pulse";
                    container.className = "px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20";
                } else {
                    thermalEl.className = "font-bold font-mono text-emerald-400";
                    container.className = "px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20";
                }
            }
        }

        function updateRefreshInterval(val) {
            const ms = parseInt(val) * 1000;
            localStorage.setItem('ui-refresh-interval', ms);
            const lbl = document.getElementById('setting-refresh-val');
            if (lbl) lbl.textContent = val + 's';
        }

        function updateThermalLimit(val) {
            localStorage.setItem('thermal-alert-limit', val);
        }

        function updateSynthVolume(val) {
            localStorage.setItem('synth-volume', val);
            const lbl = document.getElementById('setting-synth-val');
            if (lbl) lbl.textContent = val + '%';
            volume = parseFloat(val) / 100.0;
        }

        // --- Node Graph Canvas Setup ---
        let nodeCount = 0;
        function addNodeToCanvas() {
            nodeCount++;
            const container = document.getElementById('canvas-container');
            if (!container) return;
            const node = document.createElement('div');
            node.className = 'absolute p-3 bg-indigo-900/40 border border-indigo-500/50 rounded-xl shadow-lg cursor-move select-none z-20 text-xs font-mono font-bold hover:scale-105 transition-transform duration-200 text-white';
            node.style.left = `${50 + (nodeCount * 30)}px`;
            node.style.top = `${100 + (nodeCount * 25)}px`;
            node.innerText = `Symbol_Block_0${nodeCount}`;
            node.id = `user-node-${nodeCount}`;

            node.addEventListener('mousedown', (e) => {
                e.preventDefault();
                let shiftX = e.clientX - node.getBoundingClientRect().left;
                let shiftY = e.clientY - node.getBoundingClientRect().top;
                function moveAt(pageX, pageY) {
                    const rect = container.getBoundingClientRect();
                    let left = pageX - rect.left - shiftX;
                    let top = pageY - rect.top - shiftY;
                    left = Math.max(0, Math.min(left, rect.width - node.offsetWidth));
                    top = Math.max(0, Math.min(top, rect.height - node.offsetHeight));
                    node.style.left = left + 'px';
                    node.style.top = top + 'px';
                }
                function onMouseMove(event) { moveAt(event.clientX, event.clientY); }
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', () => {
                    document.removeEventListener('mousemove', onMouseMove);
                }, { once: true });
            });
            container.appendChild(node);
        }

        function runDebuggerTest() {
            const queryInput = document.getElementById('debugger-query');
            if (!queryInput) return;
            const query = queryInput.value.trim();
            if (!query) return;

            const standard = document.getElementById('standard-rag-output');
            const graph = document.getElementById('graph-rag-output');
            if (standard) standard.innerText = "Running Standard Query... ⏳";
            if (graph) graph.innerText = "Running Multi-Hop Graph Traversal... ⏳";

            setTimeout(() => {
                if (standard) standard.innerHTML = `<span class="text-rose-400">Match score: 0.72 (Single Vector Mode)</span><p class="mt-1">Found direct document match for '${query}'.</p>`;
                if (graph) graph.innerHTML = `<span class="text-emerald-400">Match score: 0.95 | Deep Hop: 4</span><p class="mt-1">Traversed knowledge graphs connections successfully.</p>`;
            }, 800);
        }

        function filterExplorerHubTable() {
            const val = document.getElementById('symbol-search').value.toLowerCase();
            document.querySelectorAll('#explorer-hub-tbody tr').forEach(row => {
                row.style.display = row.innerText.toLowerCase().includes(val) ? '' : 'none';
            });
        }

        // Chart.js render function
        function renderLandscapeChart() {
            try {
                const canvas = document.getElementById('dashboardChart');
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                const isLight = document.body.classList.contains('light-theme');
                const textColor = isLight ? '#18181b' : '#f3f4f6';

                appState.dashboardChart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Active Agents Efficiency',
                            data: [65, 78, 72, 89, 85, 96],
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderColor: '#10b981',
                            borderWidth: 2,
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                grid: { color: isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)' },
                                ticks: { color: textColor }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: textColor }
                            }
                        },
                        plugins: {
                            legend: { display: false }
                        }
                    }
                });
            } catch (e) {
                console.error("Chart initialization failed:", e);
            }
        }

        // Window load initialization
        document.addEventListener('DOMContentLoaded', () => {
            switchDomain('A');
            initRoadmapList();
            renderLandscapeChart();
            drawOscilloscope();
            connectWebSocket();
            setupDraggableNodes();

            // Glare effects on interactive cards hover
            document.addEventListener('mousemove', (e) => {
                document.querySelectorAll('.interactive-card').forEach(card => {
                    const rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    card.style.setProperty('--mouse-x', `${x}px`);
                    card.style.setProperty('--mouse-y', `${y}px`);
                });
            });

            // Config Button Flip Trigger
            document.querySelectorAll('.config-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const agent = btn.dataset.agent;
                    const flipper = document.getElementById(`${agent}-flipper`);
                    if (flipper) flipper.classList.add('rotate-y-180');
                });
            });

            document.querySelectorAll('.flip-back-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const agent = btn.dataset.agent;
                    const flipper = document.getElementById(`${agent}-flipper`);
                    if (flipper) flipper.classList.remove('rotate-y-180');
                });
            });

            // Tab button handlers for back card model sources
            const modelOptions = {
                eva: {
                    cloud: ['Gemini 2.5 Flash', 'GPT-4o Base', 'Claude 3.5 Sonnet'],
                    local: ['Llama 3 (Ollama)', 'Mistral 7B (LM Studio)', 'Phi-3 Medium']
                },
                qwen: {
                    cloud: ['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 2.5 Flash'],
                    local: ['Qwen 2.5 Coder', 'Llama 3 (Ollama)', 'Mistral 7B']
                },
                uat: {
                    cloud: ['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 2.5 Flash'],
                    local: ['Mistral 7B', 'Llama 3 (Ollama)', 'Phi-3']
                },
                local: {
                    cloud: ['Gemini 2.5 Flash', 'GPT-4o Base', 'Claude 3.5 Sonnet'],
                    local: ['Llama 3 (Ollama)', 'Mistral 7B (LM Studio)', 'Phi-3 Medium']
                }
            };

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const agent = btn.dataset.agent;
                    const source = btn.dataset.source;
                    const cardContainer = btn.closest('.backface-hidden');

                    // Switch tab active classes
                    cardContainer.querySelectorAll(`.tab-btn[data-agent="${agent}"]`).forEach(b => {
                        b.classList.remove('active');
                        b.classList.add('inactive');
                    });
                    btn.classList.add('active');
                    btn.classList.remove('inactive');

                    // Toggle API Credentials vs Local Endpoint URL inputs
                    const cloudCred = cardContainer.querySelector('.cloud-cred-sec');
                    const localCred = cardContainer.querySelector('.local-cred-sec');
                    if (source === 'cloud') {
                        if (cloudCred) cloudCred.classList.remove('hidden');
                        if (localCred) localCred.classList.add('hidden');
                    } else {
                        if (cloudCred) cloudCred.classList.add('hidden');
                        if (localCred) localCred.classList.remove('hidden');
                    }

                    // Dynamically update model options
                    const select = cardContainer.querySelector('select.model-select');
                    if (select && modelOptions[agent] && modelOptions[agent][source]) {
                        select.innerHTML = '';
                        modelOptions[agent][source].forEach(modelName => {
                            const option = document.createElement('option');
                            option.value = modelName;
                            option.textContent = modelName;
                            select.appendChild(option);
                        });
                    }
                });
            });

            // Show/Hide password key toggler
            document.querySelectorAll('.key-toggle-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = btn.closest('.cloud-cred-sec').querySelector('input');
                    if (input.type === 'password') {
                        input.type = 'text';
                        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Hide';
                    } else {
                        input.type = 'password';
                        btn.innerHTML = '<i class="fa-solid fa-eye"></i> Show';
                    }
                });
            });

            // Sync slider labels
            document.querySelectorAll('input[type="range"]').forEach(slider => {
                slider.addEventListener('input', () => {
                    const valEl = slider.parentElement.querySelector('.slider-val');
                    if (valEl) {
                        if (slider.classList.contains('temp-slider')) {
                            valEl.textContent = parseFloat(slider.value).toFixed(1);
                        } else if (slider.classList.contains('context-slider')) {
                            valEl.textContent = `${slider.value}k Tokens`;
                        } else if (slider.classList.contains('latency-slider')) {
                            valEl.textContent = `${slider.value}ms`;
                        }
                    }
                });
            });

            // Config card Action buttons (Reset & Save Changes)
            document.querySelectorAll('.backface-hidden button').forEach(btn => {
                if (btn.textContent.trim() === 'Reset' || btn.textContent.trim() === 'Save Changes') {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Find the closest flipper wrapper and flip back
                        const flipper = btn.closest('.flipper-wrapper');
                        if (flipper) flipper.classList.remove('rotate-y-180');
                    });
                }
            });

            // Raycast 3D Card tilt and glare effect
            document.querySelectorAll('.raycast-perspective-container').forEach(container => {
                container.addEventListener('mousemove', (e) => {
                    const rect = container.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    // Propagate coordinates to card shine layers
                    const cardShines = container.querySelectorAll('.shine-overlay');
                    cardShines.forEach(shine => {
                        shine.style.setProperty('--mouse-x', `${x}px`);
                        shine.style.setProperty('--mouse-y', `${y}px`);
                    });

                    const width = rect.width;
                    const height = rect.height;
                    const centerX = width / 2;
                    const centerY = height / 2;
                    const rotateX = ((centerY - y) / centerY) * 15; // tilt max 15 deg
                    const rotateY = ((x - centerX) / centerX) * 15;

                    container.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
                });
                container.addEventListener('mouseleave', () => {
                    container.style.transform = `rotateX(0deg) rotateY(0deg) scale(1)`;
                    const cardShines = container.querySelectorAll('.shine-overlay');
                    cardShines.forEach(shine => {
                        shine.style.setProperty('--mouse-x', `50%`);
                        shine.style.setProperty('--mouse-y', `50%`);
                    });
                });
            });

            // ── True Card Follow Cursor Drag ───────────────────────────────
            (function setupCardFollowDrag() {
                let floatEl = null;
                let sourceCard = null;
                let activeAgent = null;
                let offsetX = 0, offsetY = 0;
                let lastHoveredTask = null;

                function clearTaskHover() {
                    document.querySelectorAll('.task-drop-hover').forEach(el => {
                        el.classList.remove('task-drop-hover', 'drop-eva', 'drop-qwen', 'drop-uat', 'drop-local');
                    });
                    lastHoveredTask = null;
                }

                function setTaskHover(taskEl, agent) {
                    if (lastHoveredTask === taskEl) return;
                    clearTaskHover();
                    taskEl.classList.add('task-drop-hover', `drop-${agent}`);
                    lastHoveredTask = taskEl;
                }

                function findTaskItem(x, y) {
                    // Temporarily hide float to hit-test underneath
                    if (floatEl) floatEl.style.display = 'none';
                    const el = document.elementFromPoint(x, y);
                    if (floatEl) floatEl.style.display = '';
                    if (!el) return null;
                    return el.closest('.task-item');
                }

                document.querySelectorAll('.raycast-agent-card[data-agent]').forEach(card => {
                    card.addEventListener('mousedown', (e) => {
                        if (e.button !== 0) return;
                        if (e.target.closest('button') || e.target.closest('select') || e.target.closest('input') || e.target.closest('.flip-back-btn')) return;
                        e.preventDefault();

                        activeAgent = card.dataset.agent;
                        sourceCard = card;

                        const rect = card.getBoundingClientRect();
                        offsetX = e.clientX - rect.left;
                        offsetY = e.clientY - rect.top;

                        // Create floating clone
                        floatEl = card.cloneNode(true);
                        floatEl.classList.remove('absolute', 'inset-0', 'backface-hidden');
                        floatEl.classList.add('agent-drag-float');
                        floatEl.style.width = rect.width + 'px';
                        floatEl.style.height = rect.height + 'px';
                        floatEl.style.left = (e.clientX - offsetX) + 'px';
                        floatEl.style.top = (e.clientY - offsetY) + 'px';
                        // Reset inline 3D tilt styles on the clone to prevent layout distortion during drag
                        floatEl.style.transform = 'rotate(-5deg) scale(1.05)';
                        document.body.appendChild(floatEl);

                        // Fade original
                        card.classList.add('agent-card-dragging');
                        card.style.cursor = 'grabbing';

                        document.body.style.userSelect = 'none';
                    });
                });

                document.addEventListener('mousemove', (e) => {
                    if (!floatEl || !sourceCard) return;

                    floatEl.style.left = (e.clientX - offsetX) + 'px';
                    floatEl.style.top = (e.clientY - offsetY) + 'px';

                    // Hit-test for task items
                    const taskEl = findTaskItem(e.clientX, e.clientY);
                    if (taskEl) {
                        setTaskHover(taskEl, activeAgent);
                    } else {
                        clearTaskHover();
                    }
                });

                document.addEventListener('mouseup', (e) => {
                    if (!floatEl || !sourceCard) return;

                    // Check drop target
                    const taskEl = findTaskItem(e.clientX, e.clientY);
                    if (taskEl && activeAgent) {
                        // Execute existing assign logic
                        const taskId = taskEl.dataset.taskId || taskEl.querySelector('[data-task-id]')?.dataset.taskId;
                        const agentNames = { eva: 'EVA Agent', qwen: 'Qwen Coder', uat: 'UAT Agent', local: 'Local Dev' };
                        const agentName = agentNames[activeAgent] || activeAgent;
                        logTerminal(`🤖 ${agentName} assigned to task`, 'info');
                    }

                    // Cleanup
                    floatEl.remove();
                    floatEl = null;
                    sourceCard.classList.remove('agent-card-dragging');
                    sourceCard.style.cursor = 'grab';
                    sourceCard = null;
                    activeAgent = null;
                    clearTaskHover();
                    document.body.style.userSelect = '';
                });
            })();
        });

        // ============================================
        // Agent Management Carousel & Card Interactions
        // ============================================
        function initAgentManagement() {
            // =========================================
            // Agent Data
            // =========================================
            const AGENTS = [
                {
                    name: 'EVA',
                    role: 'Senior Developer',
                    model: 'Gemini 3.1 Pro',
                    avatar: '/src/avatar/Card_eva2.png',
                    portrait: '/src/avatar/Card_eva2.png',
                    videos: [
                        '/src/avatar/agent-01/asset/vdo/eva-vdo1.mp4',
                        '/src/avatar/agent-01/asset/vdo/eva-vdo2.mp4',
                        '/src/avatar/agent-01/asset/vdo/eva-vdo3.mp4'
                    ],
                    video: '/src/avatar/agent-01/asset/vdo/eva-vdo1.mp4',
                    accent: '#FF6363',
                    accentRGB: '255,99,99',
                    status: 'online',
                    tasks: '12.4k',
                    accuracy: '99.8%',
                    speed: '1.2s',
                    abilities: [
                        { icon: 'ph-globe', label: 'Web Search' },
                        { icon: 'ph-eye', label: 'Vision' },
                        { icon: 'ph-code', label: 'Code' },
                        { icon: 'ph-brain', label: 'Reasoning' },
                        { icon: 'ph-database', label: 'Persistent memory' },
                        { icon: 'ph-users-three', label: 'Multi-Agent' },
                        { icon: 'ph-infinity', label: 'Multi-Modal' }
                    ],
                    type: 'cloud',
                    package: 'Google AI Pro',
                    sessionLimit: 85,
                    sessionVal: '85k / 100k',
                    weeklyLimit: 62,
                    weeklyVal: '620k / 1M'
                },
                {
                    name: 'QWEN',
                    role: 'Research Analyst',
                    model: 'Qwen 3 235B-A22B',
                    avatar: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=100&q=80',
                    portrait: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
                    video: 'https://assets.mixkit.co/videos/preview/mixkit-cyber-security-code-on-a-monitor-40059-large.mp4',
                    accent: '#6366F1',
                    accentRGB: '99,102,241',
                    status: 'online',
                    tasks: '8.7k',
                    accuracy: '98.2%',
                    speed: '0.8s',
                    abilities: [
                        { icon: 'ph-magnifying-glass', label: 'Deep Search' },
                        { icon: 'ph-brain', label: 'Reasoning' },
                        { icon: 'ph-translate', label: 'Multilingual' },
                        { icon: 'ph-chart-line-up', label: 'Analytics' }
                    ],
                    type: 'cloud',
                    package: 'Research Tier',
                    sessionLimit: 42,
                    sessionVal: '21k / 50k',
                    weeklyLimit: 38,
                    weeklyVal: '190k / 500k'
                },
                {
                    name: 'ATLAS',
                    role: 'Infrastructure Lead',
                    model: 'Claude 4 Opus',
                    avatar: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=100&q=80',
                    portrait: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&q=80',
                    video: 'https://assets.mixkit.co/videos/preview/mixkit-circuit-board-details-42289-large.mp4',
                    accent: '#22D3EE',
                    accentRGB: '34,211,238',
                    status: 'online',
                    tasks: '15.1k',
                    accuracy: '99.5%',
                    speed: '2.1s',
                    abilities: [
                        { icon: 'ph-cloud', label: 'Cloud Ops' },
                        { icon: 'ph-database', label: 'Database' },
                        { icon: 'ph-shield-check', label: 'Security' },
                        { icon: 'ph-git-branch', label: 'CI/CD' }
                    ],
                    type: 'cloud',
                    package: 'Developer Plus',
                    sessionLimit: 90,
                    sessionVal: '180k / 200k',
                    weeklyLimit: 75,
                    weeklyVal: '1.5M / 2M'
                },
                {
                    name: 'NOVA',
                    role: 'UI/UX Designer',
                    model: 'GPT-4o Vision',
                    avatar: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=100&q=80',
                    portrait: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
                    accent: '#F472B6',
                    accentRGB: '244,114,182',
                    status: 'idle',
                    tasks: '6.3k',
                    accuracy: '97.1%',
                    speed: '1.8s',
                    abilities: [
                        { icon: 'ph-paint-brush', label: 'Design' },
                        { icon: 'ph-figma-logo', label: 'Figma' },
                        { icon: 'ph-devices', label: 'Responsive' },
                        { icon: 'ph-palette', label: 'Theming' }
                    ],
                    type: 'cloud',
                    package: 'Creative Plan',
                    sessionLimit: 55,
                    sessionVal: '44k / 80k',
                    weeklyLimit: 48,
                    weeklyVal: '384k / 800k'
                },
                {
                    name: 'SENTINEL',
                    role: 'Security Auditor',
                    model: 'Llama 4 Maverick',
                    avatar: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=100&q=80',
                    portrait: 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=800&q=80',
                    accent: '#F59E0B',
                    accentRGB: '245,158,11',
                    status: 'online',
                    tasks: '22.9k',
                    accuracy: '99.9%',
                    speed: '0.4s',
                    abilities: [
                        { icon: 'ph-lock', label: 'Encryption' },
                        { icon: 'ph-bug', label: 'Vuln Scan' },
                        { icon: 'ph-fingerprint', label: 'Auth' },
                        { icon: 'ph-wall', label: 'Firewall' }
                    ],
                    type: 'local',
                    provider: 'Ollama',
                    vramUsage: 85,
                    vramVal: '10 GB / 12 GB',
                    VGA: 'NVIDIA GeForce RTX 3060 12GB'
                },
                {
                    name: 'OMEGA',
                    role: 'Data Scientist',
                    model: 'DeepSeek R2',
                    avatar: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=100&q=80',
                    portrait: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&q=80',
                    accent: '#10B981',
                    accentRGB: '16,185,129',
                    status: 'idle',
                    tasks: '9.8k',
                    accuracy: '98.7%',
                    speed: '3.5s',
                    abilities: [
                        { icon: 'ph-chart-bar', label: 'ML Pipeline' },
                        { icon: 'ph-table', label: 'Data Wrangling' },
                        { icon: 'ph-graph', label: 'Visualization' },
                        { icon: 'ph-cpu', label: 'GPU Compute' }
                    ],
                    type: 'local',
                    provider: 'LM Studio',
                    vramUsage: 89,
                    vramVal: '21.4 GB / 24 GB',
                    temperature: '62°C'
                },
                {
                    name: 'PHANTOM',
                    role: 'Stealth Operator',
                    model: 'Mistral Large 3',
                    avatar: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&q=80',
                    portrait: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80',
                    accent: '#A78BFA',
                    accentRGB: '167,139,250',
                    status: 'offline',
                    tasks: '4.2k',
                    accuracy: '96.3%',
                    speed: '0.9s',
                    abilities: [
                        { icon: 'ph-terminal', label: 'Shell' },
                        { icon: 'ph-network', label: 'Network' },
                        { icon: 'ph-detective', label: 'OSINT' },
                        { icon: 'ph-key', label: 'Crypto' }
                    ],
                    type: 'local',
                    provider: 'Ollama',
                    vramUsage: 35,
                    vramVal: '5.6 GB / 16 GB',
                    temperature: '41°C'
                }
            ];

            // =========================================
            // State
            // =========================================
            let currentIdx = 0;
            let isDragging = false;
            let dragStartY = 0;
            let dragDelta = 0;

            // =========================================
            // DOM
            // =========================================
            const charName = document.getElementById('charName');
            const charRole = document.getElementById('charRole');
            const charModel = document.getElementById('charModel');
            const charBadge = document.getElementById('charBadge');
            const mediaContainer = document.getElementById('mediaContainer');
            const configBgMedia = document.getElementById('configBgMedia');
            const charPerspective = document.getElementById('charPerspective');
            const charTilt = document.getElementById('charTilt');
            const charFlipper = document.getElementById('charFlipper');
            const btnConfig = document.getElementById('btnConfig');
            const btnCloseConfig = document.getElementById('btnCloseConfig');

            const cfgPrompt = document.getElementById('cfgPrompt');
            const cfgModel = document.getElementById('cfgModel');
            const cfgTemp = document.getElementById('cfgTemp');
            const cfgTempVal = document.getElementById('cfgTempVal');
            const cfgContext = document.getElementById('cfgContext');
            const cfgContextVal = document.getElementById('cfgContextVal');
            const groupCloudConfig = document.getElementById('groupCloudConfig');
            const groupLocalConfig = document.getElementById('groupLocalConfig');
            const cfgApiKey = document.getElementById('cfgApiKey');
            const cfgLocalBackend = document.getElementById('cfgLocalBackend');
            const cfgLocalUrl = document.getElementById('cfgLocalUrl');
            const cfgPlanMode = document.getElementById('cfgPlanMode');
            const cfgAutoExecute = document.getElementById('cfgAutoExecute');
            const cfgVectorCount = document.getElementById('cfgVectorCount');
            const pillCloud = document.getElementById('pillCloud');
            const pillLocal = document.getElementById('pillLocal');
            const btnSaveConfig = document.getElementById('btnSaveConfig');
            const btnCancelConfig = document.getElementById('btnCancelConfig');
            const knowledgeFileInput = document.getElementById('knowledgeFileInput');

            // Temp buffer — changes don't persist until Save
            let tempConfig = {};
            let currentModelSrc = 'cloud';

            // Toast helper
            function showToast(msg, type = 'success') {
                const t = document.createElement('div');
                t.style.cssText = `position:fixed;bottom:1.5rem;right:1.5rem;z-index:99999;padding:0.75rem 1.25rem;border-radius:14px;font-size:0.75rem;font-weight:600;color:#fff;display:flex;align-items:center;gap:0.5rem;backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);animation:toastIn 0.3s ease;box-shadow:0 8px 32px rgba(0,0,0,0.4);`;
                t.style.background = type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)';
                t.style.border = type === 'success' ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(239,68,68,0.4)';
                t.innerHTML = `<i class="ph ${type === 'success' ? 'ph-check-circle' : 'ph-warning-circle'}" style="font-size:1rem;"></i> ${msg}`;
                document.body.appendChild(t);
                setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity 0.4s'; setTimeout(() => t.remove(), 400); }, 3000);
            }
            if (!document.getElementById('toastAnimStyle')) {
                const s = document.createElement('style');
                s.id = 'toastAnimStyle';
                s.textContent = '@keyframes toastIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}';
                document.head.appendChild(s);
            }

            // Model source pill switcher
            window.switchModelSrc = function (src) {
                currentModelSrc = src;
                tempConfig.type = src;
                if (src === 'cloud') {
                    pillCloud.classList.add('pill-active');
                    pillLocal.classList.remove('pill-active');
                    groupCloudConfig.style.display = 'flex';
                    groupLocalConfig.style.display = 'none';
                } else {
                    pillLocal.classList.add('pill-active');
                    pillCloud.classList.remove('pill-active');
                    groupCloudConfig.style.display = 'none';
                    groupLocalConfig.style.display = 'flex';
                }
            };

            function toggleModelSourceFields(source) {
                window.switchModelSrc(source);
            }

            // API key visibility toggle
            window.toggleApiKeyVisibility = function () {
                const input = document.getElementById('cfgApiKey');
                const icon = document.getElementById('apiKeyEyeIcon');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'ph ph-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'ph ph-eye';
                }
            };

            // Genesis knowledge file upload
            window.triggerKnowledgeUpload = function () {
                knowledgeFileInput.click();
            };
            knowledgeFileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                if (!files.length) return;
                const names = files.map(f => f.name).join(', ');
                // Increment vector count in tempConfig
                const cur = parseFloat((tempConfig.vectorCount || '1.2').toString().replace('M', ''));
                tempConfig.vectorCount = (cur + 0.1 * files.length).toFixed(1) + 'M';
                cfgVectorCount.textContent = tempConfig.vectorCount.replace('M', '') + 'M';
                showToast(`Vectorizing ${files.length} file(s): ${names.substring(0, 40)}${names.length > 40 ? '...' : ''}`);
                e.target.value = '';
            });

            // Save Changes
            btnSaveConfig.addEventListener('click', () => {
                const agent = AGENTS[currentIdx];
                if (tempConfig.type === 'cloud' && !tempConfig.apiKey && !agent.apiKey) {
                    showToast('API Key is required for Cloud mode', 'error'); return;
                }
                if (tempConfig.type === 'local') {
                    const url = tempConfig.localUrl || agent.localUrl || '';
                    if (!url.startsWith('http')) {
                        showToast('Endpoint URL must start with http/https', 'error'); return;
                    }
                }
                // Commit tempConfig into AGENTS
                Object.assign(agent, tempConfig);
                if (tempConfig.model) { charModel.textContent = tempConfig.model; }
                if (tempConfig.type) {
                    buildCards();
                    updateCarousel();
                }
                showToast('Settings saved successfully');
                charFlipper.classList.remove('flipped');
            });

            // Cancel — discard tempConfig, flip back
            btnCancelConfig.addEventListener('click', () => {
                charFlipper.classList.remove('flipped');
                // Re-populate form from current agent (not tempConfig)
                const agent = AGENTS[currentIdx];
                loadConfigForm(agent);
            });

            // Close X — same as cancel
            btnCloseConfig.addEventListener('click', () => {
                charFlipper.classList.remove('flipped');
                loadConfigForm(AGENTS[currentIdx]);
            });

            const statTasks = document.getElementById('statTasks');
            const statAccuracy = document.getElementById('statAccuracy');
            const statSpeed = document.getElementById('statSpeed');
            const abilityBar = document.getElementById('abilityBar');
            const agentCount = document.getElementById('agentCount');
            const viewport = document.getElementById('agentViewport');
            const btnUp = document.getElementById('carouselUp');
            const btnDown = document.getElementById('carouselDown');

            // =========================================
            // Build Agent Cards
            // =========================================
            function buildCards() {
                viewport.innerHTML = '';
                AGENTS.forEach((agent, i) => {
                    const slot = document.createElement('div');
                    slot.className = 'agent-card-slot';
                    slot.dataset.index = i;
                    slot.style.setProperty('--current-accent', agent.accent);
                    slot.style.setProperty('--accent-rgb', agent.accentRGB);

                    let telemetryHtml = '';
                    const statusHtml = `
                    <div style="position: absolute; top: -14px; right: 0; font-size: 0.6rem; font-weight: 600; display: flex; align-items: center; gap: 0.3rem;">
                        <span class="agent-status-dot ${agent.status}"></span>
                        <span style="color: ${agent.status === 'online' ? '#22c55e' : agent.status === 'idle' ? '#eab308' : 'rgba(255,255,255,0.3)'}; text-transform: capitalize;">${agent.status}</span>
                    </div>
                `;

                    if (agent.type === 'cloud') {
                        telemetryHtml = `
                        <div class="agent-telemetry" style="position: relative;">
                            ${statusHtml}
                            <div class="telemetry-row">
                                <div class="telemetry-meta">
                                    <span class="telemetry-label">Session Limit</span>
                                    <span class="telemetry-value">${agent.sessionLimit}%</span>
                                </div>
                                <div class="telemetry-bar-bg">
                                    <div class="telemetry-bar-fill" style="width: ${agent.sessionLimit}%;"></div>
                                </div>
                            </div>
                            <div class="telemetry-row" style="margin-top: 0.25rem;">
                                <div class="telemetry-meta">
                                    <span class="telemetry-label">Weekly Limit</span>
                                    <span class="telemetry-value">${agent.weeklyLimit}%</span>
                                </div>
                                <div class="telemetry-bar-bg">
                                    <div class="telemetry-bar-fill" style="width: ${agent.weeklyLimit}%;"></div>
                                </div>
                            </div>
                        </div>
                    `;
                    } else {
                        telemetryHtml = `
                        <div class="agent-telemetry" style="position: relative;">
                            ${statusHtml}
                            <div class="telemetry-row">
                                <div class="telemetry-meta">
                                    <span class="telemetry-label">VRAM Usage</span>
                                    <span class="telemetry-value">${agent.vramUsage}%</span>
                                </div>
                                <div class="telemetry-bar-bg">
                                    <div class="telemetry-bar-fill" style="width: ${agent.vramUsage}%;"></div>
                                </div>
                            </div>
                            <div class="telemetry-row" style="margin-top: 0.25rem;">
                                <div class="telemetry-meta">
                                    <span class="telemetry-label">Temperature</span>
                                    <span class="telemetry-value">${agent.temperature}</span>
                                </div>
                                <div class="telemetry-bar-bg">
                                    <div class="telemetry-bar-fill" style="width: ${parseInt(agent.temperature)}%;"></div>
                                </div>
                            </div>
                        </div>
                    `;
                    }

                    slot.innerHTML = `
                    <div class="agent-card">
                        <!-- Column 1: Avatar -->
                        <div class="agent-avatar">
                            <img src="${agent.avatar}" alt="${agent.name}" draggable="false">
                        </div>
                        
                        <!-- Column 2: Details & Badges -->
                        <div class="agent-info" style="display: flex; flex-direction: column; justify-content: center;">
                            <div class="agent-name">${agent.name}</div>
                            <div class="agent-class">${agent.role}</div>
                            <div class="agent-badges-row">
                                <span class="telemetry-badge">${agent.type === 'cloud' ? agent.package : agent.provider}</span>
                                <span class="telemetry-badge" style="background: rgba(255, 255, 255, 0.03); border-color: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.6);">${agent.model}</span>
                            </div>
                        </div>
                        
                        <!-- Column 3 (Cross-fade target 1): Status (Inactive) -->
                        <div class="agent-status">
                            <span class="agent-status-dot ${agent.status}"></span>
                            <span style="color: ${agent.status === 'online' ? '#22c55e' : agent.status === 'idle' ? '#eab308' : 'rgba(255,255,255,0.3)'}; text-transform: capitalize;">${agent.status}</span>
                        </div>
    
                        <!-- Column 3 (Cross-fade target 2): Telemetry (Active) -->
                        ${telemetryHtml}
                    </div>
                `;

                    slot.addEventListener('click', () => {
                        if (Math.abs(dragDelta) < 5) selectAgent(i);
                    });

                    viewport.appendChild(slot);
                });
            }

            // =========================================
            // Layout Carousel (Vertical Arc)
            // =========================================
            function updateCarousel() {
                const slots = viewport.querySelectorAll('.agent-card-slot');
                const n = slots.length;

                slots.forEach((slot, i) => {
                    let diff = i - currentIdx;
                    if (diff > n / 2) diff -= n;
                    if (diff < -n / 2) diff += n;

                    const absDiff = Math.abs(diff);

                    // Constant spacing
                    const translateY = diff * 110;
                    const translateX = -absDiff * 12;
                    const scale = Math.max(0.75, 1 - absDiff * 0.08);
                    const opacity = Math.max(0, 1 - absDiff * 0.28);
                    const zIndex = 100 - absDiff;

                    slot.style.transform = `translateY(calc(-50% + ${translateY}px)) translateX(${translateX}px) scale(${scale})`;
                    slot.style.opacity = opacity;
                    slot.style.zIndex = zIndex;
                    slot.style.pointerEvents = absDiff <= 2 ? 'auto' : 'none';

                    slot.classList.toggle('active', diff === 0);
                });
            }

            // =========================================
            // Select Agent — Update Left Sector
            // =========================================
            function selectAgent(index) {
                currentIdx = ((index % AGENTS.length) + AGENTS.length) % AGENTS.length;
                const agent = AGENTS[currentIdx];

                // Auto-unflip on change
                charFlipper.classList.remove('flipped');

                // Update media content dynamically
                const switcher = document.getElementById('vdoSwitcher');

                if (agent.videos && agent.videos.length > 0) {
                    if (agent.activeVdoIdx === undefined) {
                        agent.activeVdoIdx = 0;
                    }
                }

                function loadAgentMedia(src) {
                    const isVdo1 = src && src.includes('eva-vdo1.mp4');
                    let newEl;

                    if (src && src.endsWith('.mp4')) {
                        const video = document.createElement('video');
                        video.src = src;
                        video.autoplay = true;

                        const hasMultipleVideos = agent.videos && agent.videos.length > 1;
                        video.loop = !hasMultipleVideos;

                        video.muted = true;
                        video.playsInline = true;
                        video.style.width = '100%';
                        video.style.height = '100%';
                        video.style.objectFit = 'cover';

                        if (isVdo1) {
                            video.style.transform = 'scale(1.65)';
                            video.style.transformOrigin = 'center center';
                            video.style.objectPosition = 'center center';
                        } else {
                            video.style.objectPosition = 'top center';
                        }

                        video.setAttribute('draggable', 'false');

                        if (hasMultipleVideos) {
                            video.addEventListener('ended', () => {
                                let nextIdx = (agent.activeVdoIdx + 1) % agent.videos.length;
                                agent.activeVdoIdx = nextIdx;

                                switcher.querySelectorAll('.vdo-btn').forEach((b, i) => {
                                    b.classList.toggle('active', i === nextIdx);
                                });

                                loadAgentMedia(agent.videos[nextIdx]);
                            });
                        }
                        newEl = video;
                    } else {
                        const img = document.createElement('img');
                        img.src = src || agent.portrait;
                        img.alt = `${agent.name} Portrait`;
                        img.style.width = '100%';
                        img.style.height = '100%';
                        img.style.objectFit = 'cover';
                        img.style.objectPosition = 'top center';
                        img.setAttribute('draggable', 'false');
                        newEl = img;
                    }

                    // Setup element for absolute cross-fade positioning
                    newEl.style.position = 'absolute';
                    newEl.style.inset = '0';
                    newEl.style.opacity = '0';
                    newEl.style.transition = 'opacity 0.6s ease-in-out';

                    mediaContainer.appendChild(newEl);

                    // Trigger reflow to start transition
                    newEl.offsetHeight;
                    newEl.style.opacity = '1';

                    // Remove older child elements after transition completes
                    setTimeout(() => {
                        const children = Array.from(mediaContainer.children);
                        children.forEach(child => {
                            if (child !== newEl) {
                                child.remove();
                            }
                        });
                    }, 650);
                }

                // Setup or hide video switcher
                if (agent.videos && agent.videos.length > 0) {
                    switcher.style.opacity = '1';
                    switcher.style.pointerEvents = 'auto';
                    switcher.innerHTML = '';
                    agent.videos.forEach((vdo, idx) => {
                        const btn = document.createElement('button');
                        btn.className = `vdo-btn ${idx === agent.activeVdoIdx ? 'active' : ''}`;
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation(); // Prevent card flipping on button click
                            if (agent.activeVdoIdx === idx) return;
                            agent.activeVdoIdx = idx;

                            switcher.querySelectorAll('.vdo-btn').forEach((b, i) => {
                                b.classList.toggle('active', i === idx);
                            });
                            loadAgentMedia(vdo);
                        });
                        switcher.appendChild(btn);
                    });
                    loadAgentMedia(agent.videos[agent.activeVdoIdx]);
                } else {
                    switcher.style.opacity = '0';
                    switcher.style.pointerEvents = 'none';
                    switcher.innerHTML = '';
                    loadAgentMedia(agent.video || agent.portrait);
                }

                // Set blurred background for config panel
                configBgMedia.innerHTML = '';
                const bgImg = document.createElement('img');
                bgImg.src = agent.portrait;
                bgImg.alt = '';
                bgImg.style.width = '100%';
                bgImg.style.height = '100%';
                bgImg.style.objectFit = 'cover';
                bgImg.style.filter = 'blur(40px)';
                bgImg.setAttribute('draggable', 'false');
                configBgMedia.appendChild(bgImg);

                // Update identity
                charName.textContent = agent.name;
                charName.style.textShadow = `0 0 60px ${agent.accent}66, 0 4px 20px rgba(0,0,0,0.5)`;
                charRole.textContent = agent.role;
                charModel.textContent = agent.model;
                charBadge.style.color = agent.accent;
                charBadge.style.borderColor = `${agent.accent}4D`;
                charBadge.style.background = `${agent.accent}0F`;

                // Update stats
                statTasks.textContent = agent.tasks;
                statAccuracy.textContent = agent.accuracy;
                statSpeed.textContent = agent.speed;

                // Update accent color for stat glow
                statAccuracy.style.textShadow = `0 0 12px ${agent.accent}66`;

                // Update abilities
                abilityBar.innerHTML = agent.abilities.map(a =>
                    `<span class="ability-tag"><i class="ph ${a.icon}"></i> ${a.label}</span>`
                ).join('');

                // Update counter
                agentCount.textContent = `${currentIdx + 1} / ${AGENTS.length}`;

                // Update CSS variables for accent coloring on flipper
                charFlipper.style.setProperty('--current-accent', agent.accent);
                charFlipper.style.setProperty('--accent-rgb', agent.accentRGB);

                // Update accent on buttons
                const btnDeploy = document.getElementById('btnDeploy');
                btnDeploy.style.borderColor = agent.accent;
                btnDeploy.style.color = agent.accent;
                btnDeploy.style.background = `${agent.accent}14`;

                btnConfig.style.borderColor = agent.accent;
                btnConfig.style.color = agent.accent;

                // Populate config form from agent data (via tempConfig snapshot)
                loadConfigForm(agent);

                updateCarousel();
            }

            function loadConfigForm(agent) {
                // Deep copy to tempConfig so form edits don't instantly affect agent
                tempConfig = JSON.parse(JSON.stringify({
                    type: agent.type || 'cloud',
                    apiKey: agent.apiKey || '',
                    model: agent.model || 'Gemini 3.1 Pro',
                    provider: agent.provider || 'ollama',
                    localUrl: agent.localUrl || 'http://localhost:11434',
                    planMode: agent.planMode !== false,
                    autoExecute: agent.autoExecute || false,
                    vectorCount: agent.vectorCount || '1.2M'
                }));

                cfgPrompt.value = agent.prompt || `You are ${agent.name}, an expert ${agent.role} operating in autonomous loop mode.`;
                toggleModelSourceFields(tempConfig.type);
                cfgApiKey.value = tempConfig.apiKey;
                cfgModel.value = tempConfig.model;
                cfgLocalBackend.value = tempConfig.provider;
                cfgLocalUrl.value = tempConfig.localUrl;
                cfgPlanMode.checked = tempConfig.planMode;
                cfgAutoExecute.checked = tempConfig.autoExecute;
                cfgVectorCount.textContent = tempConfig.vectorCount.replace('M', '');
                const apiKeyInput = document.getElementById('cfgApiKey');
                if (apiKeyInput) apiKeyInput.type = 'password';
                const eyeIcon = document.getElementById('apiKeyEyeIcon');
                if (eyeIcon) eyeIcon.className = 'ph ph-eye';
                cfgTemp.value = agent.temp || 0.7;
                cfgTempVal.textContent = (agent.temp || 0.7).toFixed(1);
                cfgContext.value = agent.context || 128;
                cfgContextVal.textContent = (agent.context || 128) + 'k';
            }

            // =========================================
            // Navigation
            // =========================================
            function goNext() { selectAgent(currentIdx + 1); }
            function goPrev() { selectAgent(currentIdx - 1); }

            btnUp.addEventListener('click', goPrev);
            btnDown.addEventListener('click', goNext);

            // Keyboard
            document.addEventListener('keydown', (e) => {
                const view = document.getElementById('view-A5');
                if (!view || view.classList.contains('hidden')) return;
                if (e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
                if (e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
            });

            // Drag/Swipe (vertical)
            viewport.addEventListener('mousedown', (e) => {
                isDragging = true;
                dragStartY = e.clientY;
                dragDelta = 0;
            });
            window.addEventListener('mousemove', (e) => {
                if (!isDragging) return;
                dragDelta = e.clientY - dragStartY;
            });
            window.addEventListener('mouseup', () => {
                if (!isDragging) return;
                isDragging = false;
                if (dragDelta > 40) goPrev();
                else if (dragDelta < -40) goNext();
                // Clear drag delta after click propagation completes
                setTimeout(() => {
                    dragDelta = 0;
                }, 50);
            });

            // Touch
            viewport.addEventListener('touchstart', (e) => {
                isDragging = true;
                dragStartY = e.touches[0].clientY;
                dragDelta = 0;
            }, { passive: true });
            viewport.addEventListener('touchmove', (e) => {
                if (!isDragging) return;
                dragDelta = e.touches[0].clientY - dragStartY;
            }, { passive: true });
            viewport.addEventListener('touchend', () => {
                if (!isDragging) return;
                isDragging = false;
                if (dragDelta > 40) goPrev();
                else if (dragDelta < -40) goNext();
                setTimeout(() => {
                    dragDelta = 0;
                }, 50);
            });

            // Mouse wheel
            viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                if (e.deltaY > 0) goNext();
                else goPrev();
            }, { passive: false });

            // =========================================
            // 3D Tilt Interaction
            // =========================================
            charPerspective.addEventListener('mousemove', (e) => {
                const rect = charPerspective.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Calculate 3D Tilt rotation (-6 to +6 degrees)
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -6;
                const rotateY = ((x - centerX) / centerX) * 6;

                charTilt.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            charPerspective.addEventListener('mouseenter', () => {
                charTilt.style.transition = 'transform 0.08s ease-out';
            });

            charPerspective.addEventListener('mouseleave', () => {
                charTilt.style.transform = `rotateX(0deg) rotateY(0deg)`;
                charTilt.style.transition = 'transform 0.5s ease-out';
            });

            // =========================================
            // Form Input Event Listeners (write to tempConfig only)
            // =========================================
            cfgTemp.addEventListener('input', (e) => {
                cfgTempVal.textContent = parseFloat(e.target.value).toFixed(1);
                tempConfig.temp = parseFloat(e.target.value);
            });
            cfgContext.addEventListener('input', (e) => {
                cfgContextVal.textContent = e.target.value + 'k';
                tempConfig.context = parseInt(e.target.value);
            });
            cfgModel.addEventListener('change', (e) => { tempConfig.model = e.target.value; });
            cfgApiKey.addEventListener('input', (e) => { tempConfig.apiKey = e.target.value; });
            cfgLocalBackend.addEventListener('change', (e) => { tempConfig.provider = e.target.value; });
            cfgLocalUrl.addEventListener('input', (e) => { tempConfig.localUrl = e.target.value; });
            cfgPlanMode.addEventListener('change', (e) => { tempConfig.planMode = e.target.checked; });
            cfgAutoExecute.addEventListener('change', (e) => { tempConfig.autoExecute = e.target.checked; });
            cfgPrompt.addEventListener('input', (e) => { tempConfig.prompt = e.target.value; });

            // Open config panel — snapshot agent → tempConfig, then flip
            btnConfig.addEventListener('click', () => {
                loadConfigForm(AGENTS[currentIdx]);
                charFlipper.classList.add('flipped');
            });

            // =========================================
            // Initialize
            // =========================================
            buildCards();
            selectAgent(0);
        }
        const _origSwitchMainView = typeof switchMainView === 'function' ? switchMainView : null;
        // We hook into DOMContentLoaded to also init
        document.addEventListener('DOMContentLoaded', () => {
            // Delay init so DOM is ready
            setTimeout(initAgentManagement, 500);
        });

        window.addEventListener('resize', () => {
            updateEdges();
            updateErdEdges();
            const canvas = document.getElementById('oscilloscope-canvas');
            if (canvas) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
            }
        });