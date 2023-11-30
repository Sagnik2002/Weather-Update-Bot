/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import * as cron from 'node-cron';
import { config } from 'dotenv';
config();
import { AdminService } from './admin/admin.service';
import { UserService } from './user/user.service';



const TELEGRAM_BOT_TOKEN = '6503278183:AAEwwnc05pUHgmOY7l4a0UUR1pGWn1EsqlY';
const CITY = 'Delhi';


// Interface to represent the expected structure of the weather API response
interface WeatherResponse {
  weather: {
    description: string;
  }[];
  main: {
    temp: number;
  };
}

@Injectable()
export class TelegramBotService {
  private bot: TelegramBot;
  private subscribedUsers: Set<number> = new Set<number>();

  constructor(private readonly adminService: AdminService, private readonly userService: UserService,) {

    this.bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

    this.loadSubscribedUsers();

    this.registerCommands();

    // Schedule the sendWeatherUpdates function to run every hour
    cron.schedule('0 * * * *', () => {
      console.log("sending update");

      this.sendWeatherUpdatesToAll();
    });
  }
  private async sendWeatherUpdateForCity(chatId: number, cityName: string) {
    const apiKey = this.adminService.getApiKey();

    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${apiKey}`,
      );

      if (!response.ok) {
        Logger.error('Failed to fetch weather data');
        return;
      }

      const data: WeatherResponse = (await response.json()) as WeatherResponse;

      const weatherDescription = data.weather[0]?.description;
      const temperature = (data.main?.temp - 273.15)?.toFixed(2);

      const message = `Weather in ${cityName}:\n${weatherDescription}\nTemperature: ${temperature}°C`;

      this.bot.sendMessage(chatId, message);
    } catch (error) {
      Logger.error('Error fetching weather data', error);
    }
  }

  private registerCommands() {
    console.log("hello");

    this.bot.onText(/\/start/, async (msg) => {
      console.log("Hello");
      const chatId = msg.chat.id;
      const first_name = msg.from.first_name

      this.bot.sendMessage(chatId, `Hi ${first_name}, welcome to the weather bot, you can subscribe by using the /subscribe command, and unsubscribe using /unsubscribe command}`)


    })
    this.bot.onText(/\/weather (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const cityName = match[1]; // Extract the city name from the command

      if (cityName) {
        this.sendWeatherUpdateForCity(chatId, cityName);
      } else {
        this.bot.sendMessage(chatId, 'Please provide a city name. Example: /weather London');
      }
    });

    this.bot.onText(/\/subscribe/, async (msg) => {
      console.log(msg);

      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.first_name;

      const existingUser = await this.userService.getUserByChatId(chatId);
      console.log(existingUser);


      if (existingUser) {
        this.bot.sendMessage(chatId, 'You are already Subscribed.');
      } else {
        const user = await this.userService.createUser(userId, username);
        if (user) {
          this.bot.sendMessage(chatId, 'Subscription successful.');
          this.subscribedUsers.add(chatId);
          this.sendWeatherUpdate(chatId);
        } else {
          this.bot.sendMessage(chatId, 'Failed to Subscribe. Please try again.');
        }
      }
    });

    this.bot.onText(/\/unsubscribe/, async (msg) => {
      const chatId = msg.chat.id;

      const existingUser = await this.userService.getUserByChatId(chatId);
      if (existingUser) {
        const deletedUser = await this.userService.deleteUser(chatId);
        if (deletedUser) {
          this.subscribedUsers.delete(chatId);
          this.bot.sendMessage(chatId, 'Unsubscribed Successfully.');
        } else {
          this.bot.sendMessage(chatId, 'Failed to unsubscribe. Please try again.');
        }
      } else {
        this.bot.sendMessage(chatId, 'You are not Subscribed.');
      }
    });



  }

  private async sendWeatherUpdate(chatId: number) {

    const apiKey = this.adminService.getApiKey();
    console.log(apiKey);


    try {
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${apiKey}`,
      );

      if (!response.ok) {
        Logger.error('Failed to fetch weather data');
        return;
      }

      const data: WeatherResponse = (await response.json()) as WeatherResponse;

      const weatherDescription = data.weather[0]?.description;
      const temperature = (data.main?.temp - 273.15)?.toFixed(2); // Convert to Celsius

      const message = `Weather in ${CITY}:\n${weatherDescription}\nTemperature: ${temperature}°C`;

      this.bot.sendMessage(chatId, message);
    } catch (error) {
      Logger.error('Error fetching weather data', error);
    }
  }

  private async sendWeatherUpdatesToAll() {
    // This function sends weather updates to all subscribed users
    for (const chatId of this.subscribedUsers) {
      this.sendWeatherUpdate(chatId);
    }
  }

  private async loadSubscribedUsers() {
    const users = await this.userService.getUsers();
    users.forEach((user) => {
      this.subscribedUsers.add(user.chatId);
    });
  }

}
