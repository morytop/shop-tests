# Tests for online tool shop

## Tool Shop

Repository: https://github.com/testsmith-io/practice-software-testing

Site: https://practicesoftwaretesting.com/#/

Follow instructions in app README

## Prepare

### Local recommended tools:

- VSC
- Git
- Node >16

### Installation and setup

- (optional) install VSC recommended plugins
- install dependencies: `npm install`
- setup Playwright with: `npx playwright install --with-deps chromium`
- setup husky with: `npx husky`
- prepare local env file: `cp .env-template .env`
- copy application main URL as value of `BASE_URL` variable in `.env` file

## Use

Run all tests:

```
npx playwright test
```

For more usage cases look in `package.json` scripts section.
