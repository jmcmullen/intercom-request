import 'babel-polyfill';
import Koa from 'koa';
import Router from 'koa-router';
import Cors from 'koa-cors';
import BodyParser from 'koa-bodyparser';
import { Intercom, Client } from 'intercom-client';
import { config } from './config';

console.log(config);

const app = new Koa();
const router = Router({prefix: '/intercom'});
const client = new Client(config.intercom).usePromises();

app
  .use(Cors({ origin: true }))
  .use(BodyParser())
  .use(router.routes())
  .use(router.allowedMethods());

router.post('/', (ctx, next) => {

  const data = ctx.request.body.user;

  if(data) {
    console.log('Recieved data: ', data);
    const name = `${data.first_name} ${data.last_name}`;
    client.users.find({ email: data.email })
      .then((resp) => {
        console.log("Found!", resp);
        createIntercomMessage(resp.body, data);
      })
      .catch((error) => {
        console.log("Error", error);
        client.users.create({ name: name, email: data.email })
          .then((resp) => {
            createIntercomMessage(resp.body, data);
          })
          .catch((error) => {
            console.log(`Error! Could't create a user for ${name}`);
          });
      });
  } else {
    console.log('Invalid request: ', ctx.request.body);
    ctx.status = 400;
    ctx.body = ctx.request.body;
  }


  function createIntercomMessage(user, data) {
    const message = {
      from: {
        type: user.type,
        id: user.id
      },
      body: `A new trial request has been made.

      Name: ${user.name}
      Role: ${data.role}
      School / Organisation: ${data.school}
      Email Address: ${data.email}
      Phone Number: ${data.phone}
      `
    }
    client.messages.create(message)
      .then((resp) => {
        console.log(`New request from ${user.name} has been sent!`);
      })
      .catch((error) => {
        console.log(`Error! Failed to send message for ${user.name}.`, error);
      });
  }
});

app.listen(config.port, () => {
  console.log(`Intercom-Request is listening on ${config.port}...`);
});
