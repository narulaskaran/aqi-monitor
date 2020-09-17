from requests_html import HTMLSession
from bs4 import BeautifulSoup
import json

CONFIG_PATH = './config.json'

class AirQualityIndex:
  def __init__(self):
    with open(CONFIG_PATH) as f:
        config = json.load(f)
        self.URL = "https://www.airnow.gov/?city={}&state={}&country={}".format(config['city'], config['state'], config['country'])
        self.AQI = (-1, "NULL")
        self.AQI_CATEGORIES = config['aqi_categories']

  def update(self):
    # fetch aqi
    session = HTMLSession()
    page = session.get(self.URL)
    page.html.render()
    content = BeautifulSoup(page.content, 'html.parser')
    divs = content.find('div', class_='aqi')
    index = -1
    for div in divs:
      b = div.find('b')
      if b != None:
        index = b.text
        break

    # fetch aqi classification
    classification = "NULL"
    for category in self.AQI_CATEGORIES:
      if (category['lower'] <= index and category['upper'] > index):
        classification = category.classification
        break

    # update fields with latest data
    self.AQI = (index, classification)

  def get_latets_aqi(self):
    return self.AQI

  def log_latest_aqi(self):
    pass
