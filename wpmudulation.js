// Version 0.1
// Author deepdreams
// initial 20241007

schedule("*/10 * * * *", function () {
    
    let scriptName = name; // Lese den Skriptnamen aus
    let sunrise = getState("plenticore.0.forecast.day1.sun.sunrise").val;
    let sunset = getState("plenticore.0.forecast.day1.sun.sunset").val;
    let ModulationsautomatikDebug = getState("node-red.0.alpha-innotec.Einstellungen.ModulationsautomatikDebug").val;
    let heizautomatik = getState("node-red.0.alpha-innotec.Einstellungen.Heizautomatik").val; // Heizautomatik einlesen
    
    // Debug-Funktion mit Debugging-Flag
    function debug(message) {
        if (ModulationsautomatikDebug) {
            console.log(`DEBUG (${scriptName}): ${message}`);
        }
    }
    
    // Prüfe, ob Heizautomatik aktiviert ist
    if (!heizautomatik) {
        debug("Heizautomatik ist deaktiviert, Skript wird nicht ausgeführt.");
        setState("node-red.0.alpha-innotec.Einstellungen.PVOverload", false);
        setState("node-red.0.alpha-innotec.Einstellungen.TemperaturOffset", 0);

        return; // Beende das Skript, wenn Heizautomatik nicht aktiviert ist
    }

    // Konvertiere Sonnenaufgang und Sonnenuntergang in Zeitform
    let sunriseTime = new Date(sunrise).getTime();
    let sunsetTime = new Date(sunset).getTime();
    let now = new Date().getTime();

    // Prüfe, ob die aktuelle Zeit nach Sonnenaufgang + 1 Stunde und vor Sonnenuntergang - 1 Stunde liegt
    if (now > (sunriseTime + 3600000) && now < (sunsetTime - 3600000)) {
        debug(`Zeit zwischen Sonnenaufgang (${sunrise}) und Sonnenuntergang (${sunset})`);
        
        // Prüfe den Zustand von ModulationsAutomatik
        if (getState("node-red.0.alpha-innotec.Einstellungen.ModulationsAutomatik").val === true) {
            debug(`PVModulation eingeschaltet`);
            
            let pvOverloadMinTime = getState("node-red.0.alpha-innotec.Einstellungen.PVOverloadMinTime").val;
            let modulationRuntime = getState("node-red.0.alpha-innotec.Einstellungen.ModulationRuntime").val; // Laufzeit in Minuten
            
            let minutesConditionTrue = 0; // Zähler für Minuten, in denen die Bedingungen erfüllt sind
            let maxCheckTime = pvOverloadMinTime * 60000; // Zeit, die Bedingungen erfüllt sein müssen (in Millisekunden)

            // Funktion, die die Bedingungsprüfung und die Erweiterung der Laufzeit steuert
            function checkConditionsAndExtendRuntime() {
                let intervalCheck = setInterval(function() {
                    let bydCurrentSOC = getState("node-red.0.alpha-innotec.CommonPower.BYDCurrentSOC").val;
                    let bydModulationStartSOC = getState("node-red.0.alpha-innotec.Einstellungen.BYDModulationStartSOC").val;
                    let pvTotalCurrentPower = getState("node-red.0.alpha-innotec.CommonPower.PVTotalCurrentPower").val;
                    let wpCurrentPower = getState("node-red.0.alpha-innotec.CommonPower.WPCurrentPowerShelly3M").val;

                    // Debug mit Variablenwerten
                    debug(`Bedingungen prüfen: BYDCurrentSOC (${bydCurrentSOC}) >= BYDModulationStartSOC (${bydModulationStartSOC}) und PVTotalCurrentPower (${pvTotalCurrentPower}) > WPCurrentPowerShelly3M (${wpCurrentPower})`);

                    // Prüfe, ob BYDCurrentSOC >= BYDModulationStartSOC und PVTotalCurrentPower > WPCurrentPowerShelly3M
                    if (bydCurrentSOC >= bydModulationStartSOC && pvTotalCurrentPower > wpCurrentPower) {
                        minutesConditionTrue++; // Erhöhe den Zähler, wenn die Bedingungen erfüllt sind
                        debug(`Bedingungen erfüllt für ${minutesConditionTrue} Minute(n).`);

                        // Wenn die Bedingungen für PVOverloadMinTime Minuten erfüllt sind, aktiviere PVOverload
                        if (minutesConditionTrue >= pvOverloadMinTime) {
                            debug(`Bedingungen für mindestens ${pvOverloadMinTime} Minuten erfüllt, PVOverload wird aktiviert.`);
                            setState("node-red.0.alpha-innotec.Einstellungen.PVOverload", true);
                            setState("node-red.0.alpha-innotec.Einstellungen.TemperaturOffset", 5);
                            debug(`PVOverload aktiviert, TemperaturOffset auf 5 gesetzt`);

                            // Setze einen Timer für die ModulationRuntime
                            setTimeout(function () {
                                // Nach Ablauf der ModulationRuntime prüfe weiter, ob die Bedingungen noch gültig sind
                                let stopCheckInterval = setInterval(function() {
                                    let bydModulationStopSOC = getState("node-red.0.alpha-innotec.Einstellungen.BYDModulationStopSOC").val;
                                    pvTotalCurrentPower = getState("node-red.0.alpha-innotec.CommonPower.PVTotalCurrentPower").val;
                                    wpCurrentPower = getState("node-red.0.alpha-innotec.CommonPower.WPCurrentPowerShelly3M").val;
                                    bydCurrentSOC = getState("node-red.0.alpha-innotec.CommonPower.BYDCurrentSOC").val;

                                    // Debug mit Variablenwerten
                                    debug(`Überprüfe weiter: BYDCurrentSOC (${bydCurrentSOC}) <= BYDModulationStopSOC (${bydModulationStopSOC}) oder PVTotalCurrentPower (${pvTotalCurrentPower}) <= WPCurrentPowerShelly3M (${wpCurrentPower})`);

                                    // Prüfe, ob die Bedingungen zum Stoppen erfüllt sind
                                    if (pvTotalCurrentPower <= wpCurrentPower || bydCurrentSOC <= bydModulationStopSOC) {
                                        // Deaktiviere PVOverload und setze TemperaturOffset zurück
                                        setState("node-red.0.alpha-innotec.Einstellungen.PVOverload", false);
                                        setState("node-red.0.alpha-innotec.Einstellungen.TemperaturOffset", 0);
                                        debug(`PVOverload deaktiviert, TemperaturOffset zurückgesetzt`);

                                        // Beende den Überwachungsprozess
                                        clearInterval(stopCheckInterval);
                                    }
                                }, modulationRuntime * 60000); // Jede ModulationRuntime-Minuten prüfen
                            }, modulationRuntime * 60000); // ModulationRuntime läuft, bevor erneut geprüft wird

                            // Beende den Intervall-Check, da die Bedingungen erfüllt wurden
                            clearInterval(intervalCheck);
                        }
                    } else {
                        // Setze den Zähler zurück, wenn die Bedingungen nicht erfüllt sind
                        debug(`Bedingungen nicht erfüllt, Zähler wird zurückgesetzt.`);
                        minutesConditionTrue = 0;
                    }
                }, 60000); // Überprüfe jede Minute für PVOverloadMinTime Minuten
            }

            // Starte die erste Bedingungsprüfung
            checkConditionsAndExtendRuntime();
        } else {
            setState("node-red.0.alpha-innotec.Einstellungen.PVOverload", false);
            setState("node-red.0.alpha-innotec.Einstellungen.TemperaturOffset", 0);
            debug("Modulationsautomatik ist deaktiviert");
        }
    } else {
        setState("node-red.0.alpha-innotec.Einstellungen.PVOverload", false);
        setState("node-red.0.alpha-innotec.Einstellungen.TemperaturOffset", 0);
        debug("Zeit vor Sonnenaufgang oder nach Sonnenuntergang");
    }
});
