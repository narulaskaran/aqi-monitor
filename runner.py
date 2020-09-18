import AirQualityIndex
import Gmail
import json

if __name__ == "__main__":
    with open('./config.json') as config:
        config = json.load(config)
        AQI = AirQualityIndex.AirQualityIndex()
        gmail = Gmail.Gmail(config['email'])

        old_aqi = (-1, 'NULL')
        latest_aqi = AQI.update()

        if old_aqi[1] != latest_aqi[1]:
            message = 'Air quality in your area has moved from {} to {}. The current AQI is {}'.format(
                old_aqi[1], latest_aqi[1], latest_aqi[0])
            gmail.send_message(latest_aqi[1], message)
            print(message)
