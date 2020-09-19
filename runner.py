import AirQualityIndex
import Gmail
import json

if __name__ == "__main__":
    old_aqi = open('./last_category.txt', 'r').read()
    with open('./config.json') as config:
        # load config
        config = json.load(config)

        # create AirQualityIndex and Gmail instances
        AQI = AirQualityIndex.AirQualityIndex()
        gmail = Gmail.Gmail()

        # Get latest AQI
        latest_aqi = AQI.update()

        # if AQI changed class, store this and send an email alert to all subscribers
        if old_aqi != latest_aqi[1]:
            # store
            f = open('./last_category.txt', 'w')
            f.write(latest_aqi[1])
            f.close()
            # email
            message = 'Air quality in your area has moved from {} to {}. The current AQI is {}.'.format(
                old_aqi, latest_aqi[1], latest_aqi[0])
            for email in config['emails']:
                gmail.send_message(email, 'Air Quality Update: {}'.format(latest_aqi[1]), message)
                print(email)
