// Actuarial App Pro UI & Chart Logic

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('friend-form');
    const profilesList = document.getElementById('profiles-list');
    const modal = document.getElementById('visualizer-modal');
    const closeModalBtn = document.getElementById('close-modal');
    
    // Modal Elements
    const modalName = document.getElementById('modal-name');
    const modalExpectedAge = document.getElementById('modal-expected-age');
    const modalYearsLeft = document.getElementById('modal-years-left');
    const modalHazard = document.getElementById('modal-hazard');
    const modalAdjustments = document.getElementById('modal-adjustments');
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const deleteProfileBtn = document.getElementById('delete-profile-btn');
    
    let chartInstance = null;
    let profiles = [
        {
            id: '2',
            name: 'Low Risk Example',
            age: 30,
            sex: 'female',
            height: 65,
            weight: 130,
            smoking: 'never',
            alcohol: 'moderate',
            exercise: 'athletic',
            bloodPressure: 'normal',
            diabetes: 'none',
            familyHistory: 'no',
            timestamp: new Date().toISOString()
        },
        {
            id: '1',
            name: 'High Risk Example',
            age: 30,
            sex: 'male',
            height: 70,
            weight: 280,
            smoking: 'current',
            alcohol: 'heavy',
            exercise: 'sedentary',
            bloodPressure: 'high',
            diabetes: 'type2',
            familyHistory: 'yes',
            timestamp: new Date().toISOString()
        }
    ]; // Session-only array with pre-loaded examples
    let editingProfileId = null;
    let currentViewingProfile = null;

    renderProfiles();

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const profileData = {
            id: editingProfileId ? editingProfileId : Date.now().toString(),
            name: document.getElementById('name').value,
            age: parseInt(document.getElementById('age').value),
            sex: document.getElementById('sex').value,
            height: parseInt(document.getElementById('height').value),
            weight: parseInt(document.getElementById('weight').value),
            smoking: document.getElementById('smoking').value,
            alcohol: document.getElementById('alcohol').value,
            exercise: document.getElementById('exercise').value,
            bloodPressure: document.getElementById('bloodPressure').value,
            diabetes: document.getElementById('diabetes').value,
            familyHistory: document.getElementById('familyHistory').value,
            timestamp: new Date().toISOString()
        };

        if (editingProfileId) {
            const index = profiles.findIndex(p => p.id === editingProfileId);
            if (index !== -1) profiles[index] = profileData;
            editingProfileId = null;
            form.querySelector('button[type="submit"]').textContent = 'Generate Actuarial Model';
        } else {
            profiles.push(profileData);
        }

        saveProfiles();
        renderProfiles();
        form.reset();
        
        showVisualizer(profileData);
    });

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            if (currentViewingProfile) {
                document.getElementById('name').value = currentViewingProfile.name;
                document.getElementById('age').value = currentViewingProfile.age;
                document.getElementById('sex').value = currentViewingProfile.sex;
                document.getElementById('height').value = currentViewingProfile.height;
                document.getElementById('weight').value = currentViewingProfile.weight;
                document.getElementById('smoking').value = currentViewingProfile.smoking;
                document.getElementById('alcohol').value = currentViewingProfile.alcohol;
                document.getElementById('exercise').value = currentViewingProfile.exercise;
                document.getElementById('bloodPressure').value = currentViewingProfile.bloodPressure;
                document.getElementById('diabetes').value = currentViewingProfile.diabetes;
                document.getElementById('familyHistory').value = currentViewingProfile.familyHistory;

                editingProfileId = currentViewingProfile.id;
                form.querySelector('button[type="submit"]').textContent = 'Update Actuarial Model';
                form.scrollIntoView({ behavior: 'smooth' });
                modal.classList.remove('active');
            }
        });
    }

    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    function saveProfiles() {
        // Disabled localStorage saving for public privacy
    }

    function renderProfiles() {
        profilesList.innerHTML = '';
        if (profiles.length === 0) {
            profilesList.innerHTML = '<p style="color: var(--text-muted);">No profiles generated yet.</p>';
            return;
        }

        const sorted = [...profiles].sort((a, b) => b.id - a.id);
        sorted.forEach(profile => {
            const card = document.createElement('div');
            card.className = 'profile-card';
            
            const info = document.createElement('div');
            info.className = 'profile-info';
            
            const nameEl = document.createElement('h3');
            nameEl.textContent = profile.name;
            
            const detailsEl = document.createElement('p');
            detailsEl.textContent = `${profile.age}yo ${profile.sex === 'male' ? 'Male' : 'Female'} • Pro Projection`;
            
            info.appendChild(nameEl);
            info.appendChild(detailsEl);
            
            card.appendChild(info);

            // Add delete button directly to the card (except for examples)
            if (profile.id !== '1' && profile.id !== '2') {
                const delBtn = document.createElement('button');
                delBtn.className = 'profile-delete';
                delBtn.innerHTML = '&times;';
                delBtn.title = 'Delete Profile';
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation(); // prevent modal from opening
                    if(confirm("Delete this profile?")) {
                        profiles = profiles.filter(p => p.id !== profile.id);
                        saveProfiles();
                        renderProfiles();
                    }
                });
                card.appendChild(delBtn);
            }

            card.addEventListener('click', () => showVisualizer(profile));
            profilesList.appendChild(card);
        });
    }

    function showVisualizer(profile) {
        currentViewingProfile = profile;
        const results = simulateSurvivalCurve(profile);

        // Update Text Stats
        modalName.textContent = profile.name;
        modalExpectedAge.textContent = results.expectedAgeOfDeath;
        modalYearsLeft.textContent = results.expectedYearsRemaining;
        modalHazard.textContent = results.totalHazard + 'x';
        
        let color = 'var(--text-color)';
        if (results.totalHazard > 1.2) color = 'var(--danger)';
        if (results.totalHazard < 1.0) color = 'var(--accent-2)';
        modalHazard.style.color = color;

        // Update Risk Factors List
        modalAdjustments.innerHTML = '';
        results.adjustments.forEach(adj => {
            modalAdjustments.innerHTML += `<li class="risk-item"><span>${adj.factor}: <strong>${adj.ratio}</strong></span></li>`;
        });

        modal.classList.add('active');

        // Draw Chart
        renderChart(results.curveData, profile.age);
    }

    function renderChart(curveData, startAge) {
        const ctx = document.getElementById('survivalChart').getContext('2d');
        
        if (chartInstance) {
            chartInstance.destroy();
        }

        const labels = curveData.map(d => d.age);
        const data = curveData.map(d => d.probability);

        // Gradient for chart area
        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.5)'); // primary color
        gradient.addColorStop(1, 'rgba(139, 92, 246, 0.0)');

        chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Probability of Survival (%)',
                    data: data,
                    borderColor: '#8b5cf6',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHitRadius: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Survival: ${context.parsed.y.toFixed(1)}%`;
                            },
                            title: function(context) {
                                return `Age: ${context[0].label}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Age',
                            color: '#94a3b8'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8',
                            maxTicksLimit: 15
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Survival Probability (%)',
                            color: '#94a3b8'
                        },
                        min: 0,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#94a3b8'
                        }
                    }
                }
            }
        });
    }
});
