haproxy: 
  stats:
    enable: True
    auth:
      - 
        username: "chatab"
        password: "123qweasdzxc"
  frontend: 
    - 
      name: "app"
      bind: "*:80"
      option: 
        - "forwardfor"
        - "http-server-close"
        - "http-pretend-keepalive"
      default_backend: "express"
      acl: 
        - "url_static path_beg /css /images /img /js /sound /font /swf"
        - "url_static path_end .gif .png .jpg .css .js .mp3 .ico .html .txt .eot .svg .ttf .woff .swf .ogg .xml .less"
        - "is_faye  path_beg  /comet"
        - "is_faye hdr(Upgrade) -i WebSocket"
        - "is_faye hdr_beg(Host) -i ws"
      use_backend: 
        - "static if url_static"
        - "faye if is_faye"
  backend: 
    - 
      name: "express"
      server: 
        active: 
          - 
            name: "localhost"
            host: "127.0.0.1"
            port: "4000"
            weight: 1
            maxconn: 1000
    - 
      name: "faye"
      timeout: 
        client: "120s"
        server: "120s"
      server: 
        active: 
          - 
            name: "localhost"
            host: "127.0.0.1"
            port: "4000"
            weight: 1
            maxconn: 1000
    - 
      name: "static"
      server: 
        active: 
          - 
            name: "localhost"
            host: "127.0.0.1"
            port: "6000"
            weight: 1
            maxconn: 1000
