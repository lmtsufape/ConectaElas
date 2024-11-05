# Etapa de build
FROM node:18-alpine as build

# Instala pacotes necessários para a construção
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git

# Define o ambiente
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Define o diretório de trabalho
WORKDIR /opt/
COPY package.json package-lock.json ./
RUN npm install --only=production

WORKDIR /opt/app
COPY . .

# Roda o build para produção
RUN npm run build

# Etapa final para produção
FROM node:18-alpine

# Instala pacotes necessários
RUN apk add --no-cache vips-dev

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

# Define o diretório de trabalho
WORKDIR /opt/
COPY --from=build /opt/node_modules ./node_modules
WORKDIR /opt/app
COPY --from=build /opt/app ./

# Ajusta as permissões
RUN chown -R node:node /opt/app
USER node

# Expondo a porta
EXPOSE 1337

# Comando padrão para execução em produção
CMD ["npm", "run", "start"]
