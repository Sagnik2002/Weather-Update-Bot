/* eslint-disable prettier/prettier */
// database.module.ts

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { databaseProviders } from './database.provider';

@Module({
  imports: [MongooseModule.forRoot('mongodb+srv://sagnikbasak2002:ysLRe6ElPkABsRKW@cluster0.saute8g.mongodb.net/?retryWrites=true&w=majority')],
  providers: [...databaseProviders],
  exports: [MongooseModule], // Export MongooseModule for use in other modules
})
export class DatabaseModule { }
