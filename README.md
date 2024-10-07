# Luxtronik2-PlenticoreG3
Project to overheat with AIT Heatpump with Plenticore G3 by changing heating_target to maximum when PV Power is larger than heatpump power.

This Project is running on IOBROKER and needs some prereqs to be installed first.

1. NodeRed, java script needs to be installed in iobroker
2. coolships node-red-contrib-luxtronik2 needs to be deployed as well as node-red-contrib-luxtronik2-ws (not more supported, will try to demise it)
3. Plenticore needs to be installed in IOBROKER help available below

   https://www.iobroker.net/#en/adapters/adapterref/iobroker.plenticore/README.md

# Functional Description of the PV Overload Management Script

##1. Purpose

The primary purpose of this script is to manage the activation of the “PVOverload” state based on solar energy production and battery charge levels. It ensures that the system operates efficiently by monitoring environmental conditions and user-defined parameters.

##2. Functionality Overview

	•	The script executes every 10 minutes.
	•	It checks environmental conditions related to sunrise and sunset.
	•	It verifies the state of the heating automation and modulation automation.
	•	It monitors power levels and battery SOC (State of Charge) to determine whether to activate the PV overload feature.
	•	It maintains the PV overload state for a user-defined duration, extending the duration if conditions remain valid.
	•	It limits the number of PV overload activations per calendar day.

##3. Input Parameters

The script reads various parameters from the ioBroker state database, including:

	•	Sunrise and Sunset Times: To determine the appropriate operational window for PV overload.
	•	Heating Automation State: A flag indicating whether the heating system should be active.
	•	Modulation Automation State: A flag indicating if the modulation feature is enabled.
	•	PV Overload Minimum Time: The minimum time (in minutes) that conditions must be met before PV overload is activated.
	•	Maximum Overload Runs: The maximum number of times the PV overload can be activated in one calendar day.
	•	Modulation Runtime: The duration (in minutes) for which the PV overload should remain active once triggered.

##4. Operational Steps

	1.	Scheduled Execution: The script runs every 10 minutes, initiated by a cron-style scheduler.
	2.	Environmental Time Check:
	•	It retrieves and converts sunrise and sunset times into UNIX timestamps.
	•	It checks if the current time is at least one hour after sunrise and one hour before sunset.
	3.	State Checks:
	•	The script verifies if heating automation is enabled.
	•	It checks if modulation automation is active.
	4.	Conditions Evaluation:
	•	It reads the current state of the battery’s SOC, total solar power, and the threshold values for activating PV overload.
	•	If conditions are met (i.e., the current SOC is above the modulation start threshold and total solar power exceeds a defined limit), it activates the PV overload.
	5.	Duration Management:
	•	Once activated, the PV overload remains active for the defined modulation runtime. If conditions remain valid, the runtime can be dynamically extended.
	6.	Periodic Monitoring:
	•	The script continuously monitors the conditions at one-minute intervals.
	•	If the conditions for maintaining the PV overload state become invalid, it deactivates the overload and resets any associated settings.
	7.	Daily Limit Enforcement:
	•	The script tracks the number of PV overload activations throughout the day and prevents further activations if the daily limit is reached.
	8.	Debug Logging:
	•	Throughout its execution, the script logs relevant information and state changes for debugging and monitoring purposes.

##5. Expected Outcomes

	•	Efficient management of the solar power system’s PV overload feature.
	•	Dynamic adjustments based on real-time data, ensuring optimal performance and compliance with user-defined settings.
	•	Enhanced visibility into system operations through detailed logging.

##6. Limitations and Assumptions

	•	The script assumes that the necessary state data is available in the ioBroker database.
	•	It is dependent on the proper configuration of input parameters to function effectively.
	•	The script will not activate PV overload outside the specified operational window (i.e., during nighttime).
