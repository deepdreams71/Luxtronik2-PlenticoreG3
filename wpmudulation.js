/**
 * Script Name: PVOverload Management
 * Version: 1.0.1
 * Description: This script manages the PVOverload based on conditions related to 
 * solar power and heating automation settings. It ensures that PVOverload is activated 
 * only when certain conditions are met and within specified limits.
 * 
 * Last Updated: 2024-10-08
 * Author: deepdreams71
 */

schedule("*/10 * * * *", function () {

    let scriptName = name; // Read the script name
    let sunrise = getState("plenticore.0.forecast.day1.sun.sunrise").val;
    let sunset = getState("plenticore.0.alpha-innotec.Einstellungen.sunset").val;
    let ModulationsautomatikDebug = getState("node-red.0.alpha-innotec.Einstellungen.ModulationsautomatikDebug").val;
    let heizautomatik = getState("node-red.0.alpha-innotec.Einstellungen.Heizautomatik").val; // Read Heating Automation

    // Maximal number of PVOverload activations per day
    let maxOverloadRuns = getState("node-red.0.alpha-innotec.Einstellungen.MaxOverloadRuns").val;

    // Debug function with debug flag
    function debug(message) {
        if (ModulationsautomatikDebug) {
            console.log(`DEBUG (${scriptName}): ${message}`);
        }
    }

    // Check if heating automation is enabled
    if (!heizautomatik) {
        debug("Heating automation is disabled, script will not run.");
        return; // Exit the script if heating automation is not enabled
    }

    // Convert sunrise and sunset into time format
    let sunriseTime = new Date(sunrise).getTime();
    let sunsetTime = new Date(sunset).getTime();
    let now = new Date().getTime();

    // Check if the current time is after sunrise + 1 hour and before sunset - 1 hour
    if (now > (sunriseTime + 3600000) && now < (sunsetTime - 3600000)) {
        debug(`Time between sunrise (${sunrise}) and sunset (${sunset})`);
        
        // Check the state of ModulationsAutomatik
        if (getState("node-red.0.alpha-innotec.Einstellungen.ModulationsAutomatik").val === true) {
            debug(`PV modulation is enabled.`);
            
            let pvOverloadMinTime = getState("node-red.0.alpha-innotec.Einstellungen.PVOverloadMinTime").val;
            let modulationRuntime = getState("node-red.0.alpha-innotec.Einstellungen.ModulationRuntime").val; // Runtime in minutes
            let pvOverflowThreshold = getState("node-red.0.alpha-innotec.Einstellungen.PVOverflow").val; // PVOverflow threshold
            
            let minutesConditionTrue = 0; // Counter for minutes where conditions are met
            let currentOverloadRuns = 0; // Counter for current PVOverload activations
            let maxCheckTime = pvOverloadMinTime * 60000; // Time conditions must be met (in milliseconds)

            // Function that checks conditions and controls runtime extension
            function checkConditionsAndExtendRuntime() {
                let intervalCheck = setInterval(function() {
                    let bydCurrentSOC = getState("node-red.0.alpha-innotec.CommonPower.BYDCurrentSOC").val;
                    let bydModulationStartSOC = getState("node-red.0.alpha-innotec.Einstellungen.BYDModulationStartSOC").val;
                    let pvTotalCurrentPower = getState("node-red.0.alpha-innotec.CommonPower.PVTotalCurrentPower").val;
                    let wpCurrentPower = getState("node-red.0.alpha-innotec.CommonPower.WPCurrentPowerShelly3M").val;

                    // Debug with variable values
                    debug(`Checking conditions: BYDCurrentSOC (${bydCurrentSOC}) >= BYDModulationStartSOC (${bydModulationStartSOC}) and PVTotalCurrentPower (${pvTotalCurrentPower}) > WPCurrentPowerShelly3M (${wpCurrentPower}) and PVTotalCurrentPower > PVOverflow (${pvOverflowThreshold})`);

                    // Check if BYDCurrentSOC >= BYDModulationStartSOC, PVTotalCurrentPower > WPCurrentPowerShelly3M, and PVTotalCurrentPower > PVOverflow
                    if (bydCurrentSOC >= bydModulationStartSOC && pvTotalCurrentPower > wpCurrentPower && pvTotalCurrentPower > pvOverflowThreshold) {
                        minutesConditionTrue++; // Increase the counter if conditions are met
                        debug(`Conditions met for ${minutesConditionTrue} minute(s).`);

                        // If conditions are met for PVOverloadMinTime minutes and maxOverloadRuns is not exceeded
                        if (minutesConditionTrue >= pvOverloadMinTime && currentOverloadRuns < maxOverloadRuns) {
                            debug(`Conditions met for at least ${pvOverloadMinTime} minutes, activating PVOverload.`);
                            setState("node-red.0.alpha-innotec.Einstellungen.PVOverload", true);
                            setState("node-red.0.alpha-innotec.Einstellungen.TemperaturOffset", 5);
                            debug(`PVOverload activated, Temperature Offset set to 5.`);
                            currentOverloadRuns++; // Increase the activation counter
                            debug(`Current number of PVOverload activations: ${currentOverloadRuns}`);

                            // Set a timer for the modulation runtime
                            setTimeout(function () {
                                // After the modulation runtime, continue checking if conditions are still valid
                                let stopCheckInterval = setInterval(function() {
                                    let bydModulationStopSOC = getState("node-red.0.alpha-innotec.Einstellungen.BYDModulationStopSOC").val;
                                    pvTotalCurrentPower = getState("node-red.0.alpha-innotec.CommonPower.PVTotalCurrentPower").val;
                                    wpCurrentPower = getState("node-red.0.alpha-innotec.CommonPower.WPCurrentPowerShelly3M").val;
                                    bydCurrentSOC = getState("node-red.0.alpha-innotec.CommonPower.BYDCurrentSOC").val;

                                    // Debug with variable values
                                    debug(`Continue checking: BYDCurrentSOC (${bydCurrentSOC}) <= BYDModulationStopSOC (${bydModulationStopSOC}) or PVTotalCurrentPower (${pvTotalCurrentPower}) <= WPCurrentPowerShelly3M (${wpCurrentPower}) or PVTotalCurrentPower <= PVOverflow (${pvOverflowThreshold})`);

                                    // Check if conditions to stop are met
                                    if (pvTotalCurrentPower <= wpCurrentPower || bydCurrentSOC <= bydModulationStopSOC || pvTotalCurrentPower <= pvOverflowThreshold) {
                                        // Disable PVOverload and reset temperature offset
                                        setState("node-red.0.alpha-innotec.Einstellungen.PVOverload", false);
                                        setState("node-red.0.alpha-innotec.Einstellungen.TemperaturOffset", 0);
                                        debug(`PVOverload disabled, Temperature Offset reset.`);

                                        // End the monitoring process
                                        clearInterval(stopCheckInterval);
                                    }
                                }, modulationRuntime * 60000); // Check every modulationRuntime minutes
                            }, modulationRuntime * 60000); // ModulationRuntime runs before checking again

                            // End the interval check as conditions have been met
                            clearInterval(intervalCheck);
                        }
                    } else {
                        // Reset the counter if conditions are not met
                        debug(`Conditions not met, counter will be reset.`);
                        minutesConditionTrue = 0;
                    }
                }, 60000); // Check every minute for PVOverloadMinTime minutes
            }

            // Start the first condition check
            checkConditionsAndExtendRuntime();
        } else {
           debug("Modulation automation is disabled.");
        }
    } else {
       debug("Time before sunrise or after sunset.");
    }
});
