FROM node:16

#Create the app directory
WORKDIR /usr/src/node

#install app dependencies
COPY package*.json ./

#Run NPM install with npm ci
RUN npm ci --omit-dev

#Bundle app source
COPY . .   

EXPOSE 5002

CMD ["node", "index.js"]
