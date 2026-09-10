// Proportional Hazard Actuarial Math (Stochastic Survival Simulation)

/**
 * Calculates baseline q_x (probability of death in year x) using the Gompertz-Makeham law of mortality.
 * This mathematically approximates a standard Valuation Basic Table (VBT).
 * Formula: q_x = A + B * c^x
 */
function getBaselineQx(age, sex) {
    let A, B, c;
    if (sex === 'male') {
        A = 0.0003;
        B = 0.00004;
        c = 1.095;
    } else {
        // Females generally have lower baseline mortality
        A = 0.0002;
        B = 0.00002;
        c = 1.095;
    }
    
    let qx = A + B * Math.pow(c, age);
    
    // Cap at 1.0 (certain death)
    return Math.min(qx, 1.0);
}

/**
 * Calculates BMI based on height in inches and weight in pounds
 */
function calculateBMI(height, weight) {
    return (weight / (height * height)) * 703;
}

/**
 * Computes the Cumulative Hazard Ratio based on medical underwriting inputs.
 * A ratio of 1.0 is standard. >1.0 increases mortality risk. <1.0 decreases it.
 */
function getHazardRatio(profile, bmi) {
    let hazard = 1.0;
    const adjustments = [];

    // BMI Hazard
    if (bmi > 35) {
        hazard *= 2.0;
        adjustments.push({ factor: 'Severe Obesity (BMI > 35)', ratio: '2.0x risk' });
    } else if (bmi > 30) {
        hazard *= 1.5;
        adjustments.push({ factor: 'Obesity (BMI 30-35)', ratio: '1.5x risk' });
    } else if (bmi > 25) {
        hazard *= 1.1;
        adjustments.push({ factor: 'Overweight (BMI 25-30)', ratio: '1.1x risk' });
    } else if (bmi < 18.5) {
        hazard *= 1.25;
        adjustments.push({ factor: 'Underweight (BMI < 18.5)', ratio: '1.25x risk' });
    } else {
        hazard *= 0.95; // Slight bonus for ideal BMI
        adjustments.push({ factor: 'Healthy BMI', ratio: '0.95x risk' });
    }

    // Smoking Hazard
    if (profile.smoking === 'current') {
        hazard *= 2.5;
        adjustments.push({ factor: 'Current Smoker', ratio: '2.5x risk' });
    } else if (profile.smoking === 'former') {
        hazard *= 1.3;
        adjustments.push({ factor: 'Former Smoker', ratio: '1.3x risk' });
    } else {
        hazard *= 0.9;
        adjustments.push({ factor: 'Never Smoked', ratio: '0.9x risk' });
    }

    // Alcohol Hazard (The J-Curve)
    if (profile.alcohol === 'heavy') {
        hazard *= 1.8;
        adjustments.push({ factor: 'Heavy Drinking', ratio: '1.8x risk' });
    } else if (profile.alcohol === 'moderate') {
        hazard *= 0.95; 
        adjustments.push({ factor: 'Moderate Drinking', ratio: '0.95x risk' });
    } else {
        hazard *= 1.0;
        adjustments.push({ factor: 'Rare/No Alcohol', ratio: '1.0x risk (Baseline)' });
    }

    // Exercise Hazard
    if (profile.exercise === 'sedentary') {
        hazard *= 1.4;
        adjustments.push({ factor: 'Sedentary Lifestyle', ratio: '1.4x risk' });
    } else if (profile.exercise === 'active') {
        hazard *= 0.8;
        adjustments.push({ factor: 'Active Lifestyle', ratio: '0.8x risk' });
    } else if (profile.exercise === 'athletic') {
        hazard *= 0.7;
        adjustments.push({ factor: 'Highly Athletic', ratio: '0.7x risk' });
    }

    // Blood Pressure
    if (profile.bloodPressure === 'high') {
        hazard *= 1.6;
        adjustments.push({ factor: 'High Blood Pressure', ratio: '1.6x risk' });
    } else if (profile.bloodPressure === 'elevated') {
        hazard *= 1.2;
        adjustments.push({ factor: 'Elevated BP', ratio: '1.2x risk' });
    } else {
        hazard *= 0.95;
        adjustments.push({ factor: 'Normal BP', ratio: '0.95x risk' });
    }

    // Diabetes
    if (profile.diabetes === 'type1') {
        hazard *= 2.5;
        adjustments.push({ factor: 'Type 1 Diabetes', ratio: '2.5x risk' });
    } else if (profile.diabetes === 'type2') {
        hazard *= 1.7;
        adjustments.push({ factor: 'Type 2 Diabetes', ratio: '1.7x risk' });
    } else {
        hazard *= 1.0;
    }

    // Family History
    if (profile.familyHistory === 'yes') {
        hazard *= 1.3;
        adjustments.push({ factor: 'Family History (Heart/Cancer)', ratio: '1.3x risk' });
    } else {
        hazard *= 1.0;
    }

    return { totalHazard: hazard, adjustments };
}

/**
 * Simulates a survival curve from the current age to age 120.
 * Returns the survival curve array and calculated expected value.
 */
function simulateSurvivalCurve(profile) {
    const startAge = parseInt(profile.age);
    const bmi = calculateBMI(parseInt(profile.height), parseInt(profile.weight));
    const hazardData = getHazardRatio(profile, bmi);
    
    const maxAge = 120;
    let lx = 100000; // Starting arbitrary population at current age
    let expectedYearsRemaining = 0;
    const curveData = [];

    // Push the starting state (100% survival at current age)
    curveData.push({
        age: startAge,
        probability: 100.0,
        qx: getBaselineQx(startAge, profile.sex) * hazardData.totalHazard
    });

    for (let currentAge = startAge; currentAge < maxAge; currentAge++) {
        // Calculate probability of dying this year
        let baseQx = getBaselineQx(currentAge, profile.sex);
        let adjustedQx = Math.min(baseQx * hazardData.totalHazard, 1.0);
        
        // Number of people who die this year
        let dx = lx * adjustedQx;
        
        // People who survive to the next year
        let nextLx = lx - dx;
        
        // For expected value calculation (area under the survival curve approximation)
        // Average people alive during this year
        let Lx = (lx + nextLx) / 2;
        expectedYearsRemaining += (Lx / 100000); 

        // Update lx for the next iteration
        lx = nextLx;

        // Save data point for graph
        curveData.push({
            age: currentAge + 1,
            probability: (lx / 100000) * 100, // percentage
            qx: adjustedQx
        });
        
        if (lx <= 0) break;
    }

    return {
        expectedAgeOfDeath: Math.round((startAge + expectedYearsRemaining) * 10) / 10,
        expectedYearsRemaining: Math.round(expectedYearsRemaining * 10) / 10,
        curveData: curveData,
        bmi: Math.round(bmi * 10) / 10,
        totalHazard: Math.round(hazardData.totalHazard * 100) / 100,
        adjustments: hazardData.adjustments
    };
}
