FROM nginx:alpine

# Install openssl for SSL certificate generation
RUN apk add --no-cache openssl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Copy SSL generation script
COPY generate-ssl.sh /usr/local/bin/generate-ssl.sh
RUN chmod +x /usr/local/bin/generate-ssl.sh

# Create SSL directory
RUN mkdir -p /etc/nginx/ssl

# Generate SSL certificates
RUN /usr/local/bin/generate-ssl.sh

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]