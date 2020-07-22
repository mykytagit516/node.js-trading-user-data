# trading-user-data

This repository is responsible for handling interaction between RabbitMQ messages and User Data stored in Postgres such as:
- Settings
- Accounts
- Profile
- Orders History
- Coins History
- The detalization of the level

Every user of `btc-terminal` application can get these data. But before he should sign in the application.

This repository allows the user of the application to change his settings and update his profile. Also it handles payment and deposit's requests.

Messages are received via RabbitMQ which then triggers database requests to Postgres. The results of these database requests are then sent back via RabbitMQ.

## Requirements

  - Node.js
  - RabbitMQ
  - Postgres
  
## Installation

```
npm install
```

## Starting service


First ensure that RabbitMQ and Postgres are running. You'll also need to initialize the Postgres by running it's migrations from [bct-cryptoems-migrations](https://gitlab.com/cgblockchain-backend/trading/bct-cryptoems-migrations)

```
npm run build
npm start
```

## Tests

```
  npm run build
  npm test
```

## Coverage Report

```
  npm run build
  nyc npm test
  open ./reports/coverage/index.html
```

## WS API Documentation

API documentation will be updated over time

**Editing member's profile**

EditMemberInformationRequest:
```json
  {
    "FirstName": "first",
    "Fullname": "full",
    "LastName": "last",
    "PhotoUrl": "url",
    "Username": "user"
  }
```

EditMemberInformationResponse:
```json
{
  "Status": {
     "IsSuccess": true,
     "Message": "Member was updated successfully"
  },
  "MemberInformation": {
    "FirstName": "first",
    "Fullname": "full",
    "LastName": "last",
    "PhotoUrl": "url",
    "Username": "user"
  }
}
```

**Getting member's profile**

GetMemberInformationRequest:
```json
  {}
```

GetMemberInformationResponse:
```json
{
  "Status": {
     "IsSuccess": true,
     "Message": "Member was updated successfully"
  },
  "MemberInformation": {
    "FirstName": "first",
    "Fullname": "full",
    "LastName": "last",
    "PhotoUrl": "url",
    "Username": "user"
  }
}
