FROM node:14.16-slim as base

# Install aws-lambda-cpp build dependencies
# See https://github.com/aws/aws-lambda-nodejs-runtime-interface-client for details
RUN apt-get update
RUN apt-get install -y g++ make cmake unzip autoconf libtool libcurl4-openssl-dev

# An empty file that we can "copy" around to create dependencies between build stages
RUN echo -n > /noop

WORKDIR /usr/app

# Copy over src files and install dependencies
COPY package*.json ./
COPY src ./src/
RUN npm --production install

# Compile the source code, should output dist directory
FROM base as build
RUN npm install
RUN npm run compile

# Audit dependencies
FROM build as audit
RUN echo '\nNode version:' \
 && node --version \
 && echo '\nnpm version:' \
 && npm --version \
 && echo '\nOutdated Packages:' \
 && npm outdated || true \
 && echo '' \
 && npm audit --audit-level critical

# Check code style
FROM build as lint
RUN npm run lint

# Run tests
FROM build as unittest
COPY test ./test/
RUN npm test

# You can target this stage to check that all the tests pass
FROM base as test
COPY --from=build dist ./dist/
COPY --from=audit /noop /
COPY --from=lint /noop /
COPY --from=unittest /noop /

# Note that test is basically identical to base, except that it requires that all tests pass
FROM test as release
ENV NODE_ENV="production"
EXPOSE 8080
USER node

# Note that aws-lambda-ric must be installed as a dependency of this module
# Docs: https://github.com/aws/aws-lambda-nodejs-runtime-interface-client
ENTRYPOINT ["/usr/local/bin/npx", "aws-lambda-ric"]
CMD ["app.handler"]

# https://docs.docker.com/engine/reference/builder/
