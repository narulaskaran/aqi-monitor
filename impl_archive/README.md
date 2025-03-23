> ⚠️ **DEPRECATION NOTICE** ⚠️
>
> This is a deprecated version of the AQI Monitor written in Python. While you're welcome to browse the code for reference, this implementation is no longer maintained and not intended for active use. A newer version has been developed to replace this implementation.

# AQI Monitor

Monitors local air quality via the [IQAir API](https://www.iqair.com/us/dashboard) and sends email alerts when AQI falls or rises into a new quality zone.

I live in WA state. During the major West Coast wildfires of September 2020, I wanted to keep track of major changes in my town's air quality without having to continuously refresh the AirNow website. Waiting anxiously until I can go back out and run again.

# Setup

## Gmail

You will need to configure your Google account with credentials for the Gmail API.
Follow steps 1 and 2 [here](https://developers.google.com/gmail/api/quickstart/python).

Rename `credentials.json` from step 1 to `gmail_credentials.json`.

## API config

You will need an IQAir API key. You can sign up for a free community edition [here](https://www.iqair.com/us/dashboard/api).

Update `iq_air_credentials.json` with your API key.

## Alert recipients

Lastly, update `config.json` with all the email addresses you'd like to send email alerts to and update the location information if necessary. Right now the app is configured for Seattle, WA by default.

# Run

Run `python3 ./runner.py` from the repo directory. The first time you run the script, you will be prompted to log into your google account via a browser popup and authenticate. You should not be asked to authenticate for subsequent runs.
