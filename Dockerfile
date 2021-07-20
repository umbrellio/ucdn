FROM node:alpine

RUN yarn global add @umbrellio/ucdn

ENTRYPOINT ["/usr/local/bin/ucdn"]
