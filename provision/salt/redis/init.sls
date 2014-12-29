{% set redis = pillar['redis'] %}

download_redis:
  file.managed:
    - name: /usr/src/redis-{{ redis.get('version') }}.tar.gz
    - source: http://download.redis.io/releases/redis-{{ redis.get('version') }}.tar.gz
    - source_hash: sha1={{ redis.get('checksum') }}
    - require:
      - pkg: make
  cmd.wait:
    - cwd: /usr/src
    - names:
      - tar -zxvf redis-{{ redis.get('version') }}.tar.gz
    - watch:
      - file: /usr/src/redis-{{ redis.get('version') }}.tar.gz

make_redis:
  cmd.wait:
    - cwd: /usr/src/redis-{{ redis.get('version') }}
    - names:
      - make
      - checkinstall --install=yes --pkgname=redis --pkgversion "{{ redis.get('version') }}" --default
    - watch:
      - cmd: download_redis

/etc/redis:
  file.directory:
    - user: root
    - group: root
    - dir_mode: 755

/var/lib/redis:
  file.directory:
    - user: root
    - group: root
    - dir_mode: 755

{% for env, servers in pillar.get('redis', {}).get('servers', {}).iteritems() %}
  {% for server in servers %}
    {% set server_config = redis.get('global', {}).copy() %}
    {% do server_config.update(server) %}

setup_redis_{{ server.get('port') }}_config:
  file.managed:
    - name: /etc/redis/{{ server.get('port') }}.conf
    - source: salt://redis/redis.conf
    - template: jinja
    - context:
      config: {{ server_config }}
    - require:
      - cmd: make_redis
      - file: /etc/redis

install_redis_{{ server.get('port') }}_init_script:
  file.managed:
    - name: /etc/init.d/redis_{{ server.get('port') }}
    - source: salt://redis/redis_init
    - template: jinja
    - mode: 755
    - context:
      config: {{ server }}
    - require:
      - cmd: make_redis

create_redis_{{ server.get('port') }}_data_directory:
  file.directory:
    - name: /var/lib/redis/{{ server.get('port') }}
    - user: root
    - group: root
    - dir_mode: 755
    - require:
      - cmd: make_redis

redis_{{ server.get('port') }}:
  service:
    - running
    - enable: True
    - reload: True
    - require:
      - file: setup_redis_{{ server.get('port') }}_config
      - file: install_redis_{{ server.get('port') }}_init_script
      - file: create_redis_{{ server.get('port') }}_data_directory
    - watch:
      - file: /etc/redis/{{ server.get('port') }}.conf

run_redis_{{ server.get('port') }}:
  cmd.run:
    - name: /etc/init.d/redis_{{ server.get('port') }} start
    - require:
      - service: redis_{{ server.get('port') }}

  {% endfor %}
{% endfor %}