/* -------------------------------------------------------------
   PersonaAI - Frontend Script
   ------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const analyzerForm = document.getElementById("analyzer-form");
    const usernameInput = document.getElementById("username-input");
    const btnAnalyze = document.getElementById("btn-analyze");
    const formError = document.getElementById("form-error");
    const errorMessage = document.getElementById("error-message");
    const heroSection = document.getElementById("hero-section");
    
    // Helper to proxy requests to Flask port 5000 if page is opened on another port locally (e.g., Live Server port 5500, or directly via file://)
    function getApiUrl(path) {
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if ((isLocalhost && window.location.port !== '5000') || window.location.protocol === 'file:') {
            return `http://127.0.0.1:5000${path}`;
        }
        return path;
    }
    
    // Theme Toggle
    const btnThemeToggle = document.getElementById("btn-theme-toggle");
    const themeIcon = btnThemeToggle.querySelector("i");
    
    // Sidebar History Elements
    const btnToggleHistory = document.getElementById("btn-toggle-history");
    const btnCloseHistory = document.getElementById("btn-close-history");
    const historySidebar = document.getElementById("history-sidebar");
    const sidebarOverlay = document.getElementById("sidebar-overlay");
    const historySearchInput = document.getElementById("history-search-input");
    const historyItemsList = document.getElementById("history-items-list");
    
    // Loading Screen
    const loadingOverlay = document.getElementById("loading-overlay");
    const loaderStatusTitle = document.getElementById("loader-status-title");
    const loaderStatusText = document.getElementById("loader-status-text");
    
    // Results DOM Elements
    const resultsSection = document.getElementById("results-section");
    const resUsername = document.getElementById("res-username");
    const resPersonalityType = document.getElementById("res-personality-type");
    const resIntelIndicator = document.getElementById("res-intelligence-indicator-banner");
    const resConfidenceScore = document.getElementById("res-confidence-score");
    const confidenceRing = document.getElementById("confidence-ring");
    
    const resIntrovertExtrovertPct = document.getElementById("res-introvert-extrovert-pct");
    const resSpectrumHandle = document.getElementById("res-spectrum-handle");
    const resCreativityVal = document.getElementById("res-creativity-val");
    const resCreativityBar = document.getElementById("res-creativity-bar");
    const resLeadershipVal = document.getElementById("res-leadership-val");
    const resLeadershipBar = document.getElementById("res-leadership-bar");
    const resSocialEnergyVal = document.getElementById("res-social-energy-val");
    const resSocialEnergyBar = document.getElementById("res-social-energy-bar");
    const resHumorVal = document.getElementById("res-humor-val");
    const resHumorBar = document.getElementById("res-humor-bar");
    
    const resOverview = document.getElementById("res-overview");
    const resStrengthsList = document.getElementById("res-strengths-list");
    const resWeaknessesList = document.getElementById("res-weaknesses-list");
    const resHiddenTalentsList = document.getElementById("res-hidden-talents-list");
    const resCommunicationStyle = document.getElementById("res-communication-style");
    const resLearningStyle = document.getElementById("res-learning-style");
    const resCareersContainer = document.getElementById("res-careers-container");
    const resFactsList = document.getElementById("res-facts-list");
    
    const resInsightSays = document.getElementById("res-insight-says");
    const resInsightPerceive = document.getElementById("res-insight-perceive");
    const resInsightSuccess = document.getElementById("res-insight-success");
    const resInsightUnique = document.getElementById("res-insight-unique");
    
    const resSyncAnimal = document.getElementById("res-sync-animal");
    const resSyncSuperhero = document.getElementById("res-sync-superhero");
    const resSyncCharacter = document.getElementById("res-sync-character");
    const resSyncGamer = document.getElementById("res-sync-gamer");
    const resSyncQuote = document.getElementById("res-sync-quote");
    
    // Control Actions
    const btnShare = document.getElementById("btn-share");
    const btnDownloadPdf = document.getElementById("btn-download-pdf");
    const btnHistoryBack = document.getElementById("btn-history-back");
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toast-message");

    // State Variables
    let currentTheme = "dark";
    try {
        currentTheme = localStorage.getItem("theme") || "dark";
    } catch (e) {
        console.warn("localStorage is not accessible:", e);
    }
    let activeRadarChart = null;
    let loadingInterval = null;
    let lastLoadedResult = null; // Store currently viewed result

    // -------------------------------------------------------------
    // Theme Management
    // -------------------------------------------------------------
    function initTheme() {
        document.documentElement.setAttribute("data-theme", currentTheme);
        updateThemeUI();
    }

    function updateThemeUI() {
        if (currentTheme === "dark") {
            themeIcon.className = "fa-solid fa-sun";
            btnThemeToggle.setAttribute("title", "Switch to Light Mode");
        } else {
            themeIcon.className = "fa-solid fa-moon";
            btnThemeToggle.setAttribute("title", "Switch to Dark Mode");
        }
        
        // Re-draw chart with new theme colors if it is active
        if (activeRadarChart && lastLoadedResult) {
            drawRadarChart(lastLoadedResult);
        }
    }

    btnThemeToggle.addEventListener("click", () => {
        currentTheme = currentTheme === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", currentTheme);
        try {
            localStorage.setItem("theme", currentTheme);
        } catch (e) {
            console.warn("localStorage is not accessible:", e);
        }
        updateThemeUI();
    });

    // -------------------------------------------------------------
    // History Panel Drawer Operations
    // -------------------------------------------------------------
    function toggleHistorySidebar(open) {
        if (open) {
            historySidebar.classList.add("open");
            sidebarOverlay.classList.remove("hidden");
            loadHistoryList(historySearchInput.value);
        } else {
            historySidebar.classList.remove("open");
            sidebarOverlay.classList.add("hidden");
        }
    }

    btnToggleHistory.addEventListener("click", () => toggleHistorySidebar(true));
    btnCloseHistory.addEventListener("click", () => toggleHistorySidebar(false));
    sidebarOverlay.addEventListener("click", () => toggleHistorySidebar(false));

    // Live search filtering
    historySearchInput.addEventListener("input", (e) => {
        loadHistoryList(e.target.value);
    });

    // Fetch history list from REST API
    async function loadHistoryList(searchQuery = "") {
        try {
            const url = getApiUrl(searchQuery ? `/api/history?search=${encodeURIComponent(searchQuery)}` : '/api/history');
            const response = await fetch(url);
            if (!response.ok) throw new Error("Failed to load history list.");
            const history = await response.json();
            
            historyItemsList.innerHTML = "";
            
            if (history.length === 0) {
                historyItemsList.innerHTML = `
                    <li class="empty-history-msg text-center text-muted">
                        <i class="fa-solid fa-folder-open"></i>
                        <p>${searchQuery ? 'No usernames match your search.' : 'No analyses found. Time to scan some tags!'}</p>
                    </li>
                `;
                return;
            }

            history.forEach(item => {
                const date = new Date(item.timestamp).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                const li = document.createElement("li");
                li.className = "history-item";
                li.innerHTML = `
                    <div class="history-info">
                        <span class="history-name">@${item.username}</span>
                        <span class="history-type">${item.personality_type} (Conf: ${item.confidence_score}%)</span>
                        <span class="history-meta"><i class="fa-regular fa-calendar-days"></i> ${date}</span>
                    </div>
                    <button class="btn-delete-history" aria-label="Delete entry" title="Delete from history" data-id="${item.id}">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                `;
                
                // Clicking item loads it into dashboard
                li.addEventListener("click", (e) => {
                    // Prevent loading when clicking the delete button
                    if (e.target.closest(".btn-delete-history")) return;
                    
                    renderResult(item.result);
                    toggleHistorySidebar(false);
                    setTimeout(() => {
                        scrollToElement(resultsSection);
                    }, 100);
                });

                // Deleting individual item
                const btnDelete = li.querySelector(".btn-delete-history");
                btnDelete.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    const itemId = btnDelete.getAttribute("data-id");
                    await deleteHistoryItem(itemId);
                });

                historyItemsList.appendChild(li);
            });
        } catch (error) {
            console.error("Error loading history:", error);
        }
    }

    async function deleteHistoryItem(id) {
        try {
            const response = await fetch(getApiUrl(`/api/history/${id}`), { method: 'DELETE' });
            if (!response.ok) throw new Error("Delete failed.");
            showToast("Item deleted from history.");
            loadHistoryList(historySearchInput.value);
        } catch (error) {
            console.error("Delete history error:", error);
            showToast("Could not delete item.");
        }
    }

    // -------------------------------------------------------------
    // Toast Notification helper
    // -------------------------------------------------------------
    function showToast(message) {
        toastMessage.textContent = message;
        toast.classList.remove("hidden");
        // Clear any old classes
        toast.style.animation = 'none';
        toast.offsetHeight; // trigger reflow
        toast.style.animation = null;
        
        setTimeout(() => {
            toast.classList.add("hidden");
        }, 3000);
    }

    // Smooth Scroll Helper
    function scrollToElement(element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // -------------------------------------------------------------
    // Loading Screen Witty Roast Loop
    // -------------------------------------------------------------
    const loadingRoasts = [
        { title: "Analyzing Synapses...", text: "Checking letters for subconscious behavioral cues..." },
        { title: "Calculating Sarcasm Index...", text: "Sifting through internet references for snark vectors..." },
        { title: "Scanning Social Footprint...", text: "Consulting digital guides on how gamer tags affect real life..." },
        { title: "Calibrating Neural Net...", text: "Pouring double espressos into memory buffers..." },
        { title: "Analyzing Cognitive Flaws...", text: "Estimating average daily hours spent ignoring chores..." },
        { title: "Matching Spirit Species...", text: "Deciding if you behave more like an owl or a raccoon..." },
        { title: "Consulting AI Horoscope...", text: "Aligning emoji configurations and username nodes..." },
        { title: "Compiling Report...", text: "Writing custom roast protocols. Ready in just a moment..." }
    ];

    function startLoadingAnimation() {
        loadingOverlay.classList.remove("hidden");
        resultsSection.classList.add("hidden");
        formError.classList.add("hidden");
        
        let index = 0;
        loaderStatusTitle.textContent = loadingRoasts[index].title;
        loaderStatusText.textContent = loadingRoasts[index].text;
        
        loadingInterval = setInterval(() => {
            index = (index + 1) % loadingRoasts.length;
            loaderStatusTitle.style.opacity = 0;
            loaderStatusText.style.opacity = 0;
            
            setTimeout(() => {
                loaderStatusTitle.textContent = loadingRoasts[index].title;
                loaderStatusText.textContent = loadingRoasts[index].text;
                loaderStatusTitle.style.opacity = 1;
                loaderStatusText.style.opacity = 1;
            }, 300);
        }, 2200);
    }

    function stopLoadingAnimation() {
        clearInterval(loadingInterval);
        loadingOverlay.classList.add("hidden");
    }

    // -------------------------------------------------------------
    // Form submission & Analysis Request
    // -------------------------------------------------------------
    analyzerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = usernameInput.value.trim();
        
        if (!username) return;
        
        usernameInput.blur(); // Remove focus from the input field to allow proper smooth scrolling

        // Show loading
        startLoadingAnimation();
        scrollToElement(loadingOverlay);

        try {
            const response = await fetch(getApiUrl('/api/analyze'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            if (!response.ok) {
                let errorMsg = "Analysis failed.";
                try {
                    const errData = await response.json();
                    errorMsg = errData.error || errorMsg;
                } catch (e) {
                    errorMsg = `Server error (${response.status}). Please make sure the Flask backend is running on port 5000.`;
                }
                throw new Error(errorMsg);
            }

            let data;
            try {
                data = await response.json();
            } catch (e) {
                throw new Error("Failed to parse response from server. Make sure the backend server is running and returning valid JSON.");
            }
            
            // Wait slightly for loader visual smoothness
            setTimeout(() => {
                try {
                    stopLoadingAnimation();
                    renderResult(data);
                    loadHistoryList(); // Update the history list so the new analysis shows up immediately
                    
                    // Defer scrolling slightly to ensure layout is updated and section is unhidden
                    setTimeout(() => {
                        scrollToElement(resultsSection);
                    }, 100);
                    
                    if (data.is_mock) {
                        showToast("Offline fallback triggered! (Keys missing/quota limit)");
                    } else {
                        showToast("Analysis compiled successfully!");
                    }
                } catch (err) {
                    stopLoadingAnimation();
                    console.error("Error rendering results:", err);
                    errorMessage.textContent = `Error rendering results: ${err.message}. Please check developer console logs.`;
                    formError.classList.remove("hidden");
                    scrollToElement(heroSection);
                }
            }, 1000);

        } catch (error) {
            stopLoadingAnimation();
            let msg = error.message || "An unexpected error occurred. Please try again.";
            if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
                msg = "Could not connect to the Flask server. Please make sure the Flask backend is running (python app.py) and is listening on port 5000.";
            }
            errorMessage.textContent = msg;
            formError.classList.remove("hidden");
            scrollToElement(heroSection);
        }
    });

    // -------------------------------------------------------------
    // Render Results to UI Dashboard
    // -------------------------------------------------------------
    function renderResult(data) {
        lastLoadedResult = data;
        resultsSection.classList.remove("hidden");
        
        // Fill Texts
        resUsername.textContent = `@${data.username || ''}`;
        resPersonalityType.textContent = data.personality_type || '';
        resIntelIndicator.textContent = `Intelligence Bracket: ${data.intelligence_indicator || ''}`;
        resOverview.textContent = data.overview || '';
        resCommunicationStyle.textContent = data.communication_style || '';
        resLearningStyle.textContent = data.learning_style || '';
        
        // Circular Gauge Animation
        resConfidenceScore.textContent = data.confidence_score || 0;
        if (confidenceRing && confidenceRing.r && confidenceRing.r.baseVal) {
            const radius = confidenceRing.r.baseVal.value;
            const circumference = 2 * Math.PI * radius;
            confidenceRing.style.strokeDasharray = `${circumference} ${circumference}`;
            
            // Animate stroke dashoffset
            const score = data.confidence_score || 0;
            const offset = circumference - (score / 100) * circumference;
            confidenceRing.style.strokeDashoffset = offset;
        }

        // Slider Bar
        // Introvert vs Extrovert
        const introvertExtrovertVal = typeof data.introvert_extrovert_meter === 'number' ? data.introvert_extrovert_meter : 50;
        if (resIntrovertExtrovertPct) {
            resIntrovertExtrovertPct.textContent = `Introvert: ${100 - introvertExtrovertVal}% / Extrovert: ${introvertExtrovertVal}%`;
        }
        if (resSpectrumHandle) {
            resSpectrumHandle.style.left = `${introvertExtrovertVal}%`;
        }

        // Fill Progress Bars
        animateProgressBar(resCreativityBar, resCreativityVal, data.creativity_score || 0);
        animateProgressBar(resLeadershipBar, resLeadershipVal, data.leadership_score || 0);
        animateProgressBar(resSocialEnergyBar, resSocialEnergyVal, data.social_energy_score || 0);
        animateProgressBar(resHumorBar, resHumorVal, data.humor_level || 0);

        // Lists
        populateList(resStrengthsList, data.strengths || []);
        populateList(resWeaknessesList, data.weaknesses || []);
        populateList(resHiddenTalentsList, data.hidden_talents || []);
        populateList(resFactsList, data.fun_facts || []);

        // Career Badges
        resCareersContainer.innerHTML = "";
        const careers = data.career_recommendations || [];
        careers.forEach(career => {
            const span = document.createElement("span");
            span.className = "career-badge";
            span.textContent = career;
            resCareersContainer.appendChild(span);
        });

        // Insights Section
        resInsightSays.textContent = data.insights?.what_says_about_you || '';
        resInsightPerceive.textContent = data.insights?.how_others_perceive_you || '';
        resInsightSuccess.textContent = data.insights?.future_success_areas || '';
        resInsightUnique.textContent = data.insights?.unique_traits || '';

        // Entertainment Archetypes
        resSyncAnimal.textContent = data.entertainment?.spirit_animal || '';
        resSyncSuperhero.textContent = data.entertainment?.superhero_match || '';
        resSyncCharacter.textContent = data.entertainment?.movie_character || '';
        resSyncGamer.textContent = data.entertainment?.gamer_archetype || '';
        resSyncQuote.textContent = data.entertainment?.motivational_quote ? `"${data.entertainment.motivational_quote}"` : '';

        // Render Radar Chart
        try {
            if (typeof Chart !== 'undefined') {
                drawRadarChart(data);
            } else {
                console.warn("Chart.js is not loaded. Skipping character polygon render.");
                const chartContainer = document.querySelector(".chart-container");
                if (chartContainer) {
                    chartContainer.innerHTML = "<p class='text-muted' style='text-align:center; padding: 2rem; font-size: 0.9rem;'>Radar chart visualization requires Chart.js library to load. Please check your internet connection.</p>";
                }
            }
        } catch (chartErr) {
            console.error("Error drawing radar chart:", chartErr);
        }
    }

    function animateProgressBar(barElement, textElement, targetScore) {
        barElement.style.width = "0%";
        textElement.textContent = "0%";
        
        setTimeout(() => {
            barElement.style.width = `${targetScore}%`;
            
            // Fast text ticker
            let cur = 0;
            const interval = setInterval(() => {
                if (cur >= targetScore) {
                    textElement.textContent = `${targetScore}%`;
                    clearInterval(interval);
                } else {
                    cur += Math.ceil(targetScore / 10);
                    if (cur > targetScore) cur = targetScore;
                    textElement.textContent = `${cur}%`;
                }
            }, 30);
        }, 100);
    }

    function populateList(listElement, itemsArray) {
        listElement.innerHTML = "";
        itemsArray.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            listElement.appendChild(li);
        });
    }

    // -------------------------------------------------------------
    // Chart.js Radar Plot Drawer
    // -------------------------------------------------------------
    function drawRadarChart(data) {
        if (activeRadarChart) {
            activeRadarChart.destroy();
        }

        const ctx = document.getElementById("personality-radar-chart").getContext("2d");
        
        // Dynamic colors based on theme
        const isDark = currentTheme === "dark";
        const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
        const angleLineColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.08)";
        const labelTextColor = isDark ? "#F8FAFC" : "#0F172A";

        activeRadarChart = new Chart(ctx, {
            type: "radar",
            data: {
                labels: ["Creativity", "Leadership", "Social Energy", "Humor/Wit", "Confidence"],
                datasets: [{
                    label: "Alias Vibe Vector",
                    data: [
                        data.creativity_score,
                        data.leadership_score,
                        data.social_energy_score,
                        data.humor_level,
                        data.confidence_score
                    ],
                    backgroundColor: "rgba(16, 185, 129, 0.25)",
                    borderColor: "#10B981",
                    borderWidth: 3,
                    pointBackgroundColor: "#06B6D4",
                    pointBorderColor: "#FFFFFF",
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: "#FFFFFF",
                    pointHoverBorderColor: "#8B5CF6",
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false // We already have a title card
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: {
                            display: false,
                            stepSize: 20
                        },
                        grid: {
                            color: gridColor
                        },
                        angleLines: {
                            color: angleLineColor
                        },
                        pointLabels: {
                            color: labelTextColor,
                            font: {
                                family: "'Outfit', sans-serif",
                                size: 11,
                                weight: 600
                            }
                        }
                    }
                }
            }
        });
    }

    // -------------------------------------------------------------
    // Share Results Operation
    // -------------------------------------------------------------
    btnShare.addEventListener("click", () => {
        if (!lastLoadedResult) return;
        
        const username = lastLoadedResult.username;
        const personality = lastLoadedResult.personality_type;
        const confidence = lastLoadedResult.confidence_score;
        const shareText = `🔍 PersonaAI Report for @${username}:\n✨ Archetype: ${personality}\n🔥 Vibe Confidence: ${confidence}%\n⚡ Spirit Animal: ${lastLoadedResult.entertainment.spirit_animal}\nCheck yours at PersonaAI!`;
        
        // Share via Navigator Web Share if supported
        if (navigator.share) {
            navigator.share({
                title: 'PersonaAI - Personality Analyzer',
                text: shareText,
                url: window.location.origin
            }).then(() => {
                showToast("Report shared successfully!");
            }).catch((err) => {
                console.log("Error sharing:", err);
                copyToClipboard(shareText);
            });
        } else {
            // Clipboard Fallback
            copyToClipboard(shareText);
        }
    });

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Report overview copied to clipboard!");
        }).catch(err => {
            console.error("Clipboard copy failed:", err);
            showToast("Could not copy link.");
        });
    }

    // -------------------------------------------------------------
    // PDF Generation via html2pdf.js
    // -------------------------------------------------------------
    btnDownloadPdf.addEventListener("click", () => {
        if (!lastLoadedResult) return;
        
        const username = lastLoadedResult.username;
        const element = document.getElementById("pdf-report-content");
        
        showToast("Generating PDF report...");
        
        const opt = {
            margin:       0, // Full bleed background (no white margins)
            filename:     `PersonaAI_Report_${username}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true,
                backgroundColor: currentTheme === 'dark' ? '#0f172a' : '#f1f5f9' 
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak:    { mode: ['avoid-all', 'css'] }
        };
        
        // Add class for print styling
        element.classList.add("generating-pdf");
        
        html2pdf().set(opt).from(element).save().then(() => {
            // Restore styles
            element.classList.remove("generating-pdf");
            showToast("PDF downloaded!");
        }).catch(err => {
            console.error("PDF generation failed:", err);
            showToast("PDF generation failed.");
            // Restore styles
            element.classList.remove("generating-pdf");
        });
    });

    // Back to top button action
    btnHistoryBack.addEventListener("click", () => {
        scrollToElement(document.getElementById("hero-section"));
    });

    // -------------------------------------------------------------
    // Initializer Runs
    // -------------------------------------------------------------
    initTheme();
    loadHistoryList(); // Cache history immediately on start
});
