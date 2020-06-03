FROM node:14.4.0-alpine

RUN mkdir /usr/app

WORKDIR /usr/app

COPY . .
RUN yarn

ENV NODE_ENV production

CMD [ "yarn", "dev" ] 

