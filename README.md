![symphony preview](https://github.com/symphony-hq/symphony/assets/17938322/efda7e04-be74-4205-8784-d7900e7ee0a6)

## Getting Started

Please make sure you have the following dependencies installed:

```bash
- virtualenv: https://virtualenv.pypa.io/en/latest/installation.html
- postgresql: https://www.postgresql.org/download
- postgrest: https://postgrest.org/en/stable/explanations/install.html
```

Clone the repository

```bash
git clone https://github.com/symphony-hq/symphony project-name
```

Navigate into the directory and initialize the project

```bash
cd project-name && yarn && yarn nps initialize
```

Create an .env file in the root directory and add your OpenAI key

```tsx
OPENAI_API_KEY=...
```

Start the project
```bash
yarn nps start
```

Visit https://symphony.run/docs to view the full docs.

## Contributing
Open to improvements and bug fixes!