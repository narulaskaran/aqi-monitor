import requests, json, time

CONFIG_PATH = './config.json'
IQ_AIR_CREDENTIAL_PATH = './iq_air_credentials.json'
HISTORICAL_AQI_LOG_PATH = './historical_aqi.csv'

class AirQualityIndex:
  def __init__(self):
    with open(CONFIG_PATH) as config, open(IQ_AIR_CREDENTIAL_PATH) as iq_air_credentials:
      config = json.load(config)
      iq_air_credentials = json.load(iq_air_credentials)
      self.URL = iq_air_credentials['endpoint']
      self.QUERY_PARAMS = {
        'key': iq_air_credentials['key'],
        'country': config['country'],
        'state': config['state'],
        'city': config['city']
      }
      self.AQI = (-1, "NULL")
      self.AQI_CATEGORIES = config['aqi_categories']

  def update(self):
    # fetch aqi
    res = requests.get(self.URL, self.QUERY_PARAMS)
    if not res.ok:
      raise Exception("Request to IQAir API failed when trying to fetch latest data")
    index = res.json()['data']['current']['pollution']['aqius']
    if index == None:
      index = -1

    # fetch aqi classification
    classification = "NULL"
    for category in self.AQI_CATEGORIES:
      if category['lower'] <= index and category['upper'] > index:
        classification = category['classification']

    # update fields with latest data
    self.AQI = (index, classification)

    # write latest AQI to historical log
    self.log_latest_aqi()

    # return latest AQI and classification
    return self.get_latest_aqi()


  def get_latest_aqi(self):
    return self.AQI

  def log_latest_aqi(self):
    with open(HISTORICAL_AQI_LOG_PATH, 'a') as csv:
      csv.write('\n{},{},{}'.format(time.time(), self.AQI[0], self.AQI[1]))
