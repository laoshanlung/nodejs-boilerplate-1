postgresql_repo:
  pkgrepo.managed:
    - name: deb http://apt.postgresql.org/pub/repos/apt/ precise-pgdg main
    - file: /etc/apt/sources.list.d/pgdg.list
    - key_url: https://www.postgresql.org/media/keys/ACCC4CF8.asc


{% set postgresql_config_files = ['pg_hba.conf'] %}

postgresql_packages:
  pkg.installed:
    - names:
      - libpq-dev
      - postgresql-9.3
      - postgresql-client-9.3
      - postgresql-contrib-9.3
      - pgbouncer
    - require:
      - pkgrepo: postgresql_repo

postgresql:
  service:
    - running
    - enable: True
    - reload: True
    - require:
      - pkg: postgresql_packages
    - watch:
      {% for file in postgresql_config_files %}
      - file: /etc/postgresql/9.3/main/{{ file }}
      {% endfor %}

{% for env, server in pillar.get('postgresql', {}).iteritems() %}
app_db_{{ env }}_user:
  postgres_user.present:
    - name: {{ server['username'] }}
    - password: {{ server['password'] }}
    - runas: postgres
    - require:
      - service: postgresql

app_db_{{ env }}:
  postgres_database.present:
    - name: {{ server['database'] }}
    - encoding: UTF8
    - template: template0
    - owner: {{ server['username'] }}
    - runas: postgres
    - require:
      - postgres_user: app_db_{{ env }}_user

uuid_ext_db_{{ env }}:
  postgres_extension.present:
    - name: uuid-ossp
    - user: postgres
    - maintenance_db: {{ server['database'] }}
    - require:
      - postgres_database: app_db_{{ env }}

schema_migration_{{ env }}:
  cmd.run:
    - shell: /bin/bash
    - user: {{ pillar['app']['user'] }}
    - cwd: {{ pillar['app']['path'] }}/schema
    - name: source env/bin/activate && python update.py {{ env }}
    - require:
      - postgres_database: app_db_{{ env }}
      - virtualenv: {{ pillar['app']['path'] }}/schema/env
      - service: pgbouncer
{% endfor %}

{% for file in postgresql_config_files %}
/etc/postgresql/9.3/main/{{ file }}:
  file.managed:
    - source: salt://postgresql/{{ file }}
    - template: jinja
{% endfor %}

/home/{{ pillar['app']['user'] }}/.pgpass:
  file.managed:
    - source: salt://postgresql/pgpass
    - template: jinja
    - user: {{ pillar['app']['user'] }}
    - group: {{ pillar['app']['group'] }}
    - mode: 600

{% set pgbouncer_config_files = ['pgbouncer.ini', 'userlist.txt'] %}

default_pgbouncer:
  file.managed:
    - name: /etc/default/pgbouncer
    - source: salt://postgresql/default_pgbouncer
    - template: jinja

{% for file in pgbouncer_config_files %}
/etc/pgbouncer/{{ file }}:
  file.managed:
    - source: salt://postgresql/{{ file }}
    - template: jinja
{% endfor %}

pgbouncer:
  service:
    - running
    - enable: True
    - reload: True
    - require:
      - pkg: postgresql_packages
      - file: default_pgbouncer
      {% for file in pgbouncer_config_files %}
      - file: /etc/pgbouncer/{{ file }}
      {% endfor %}
    - watch:
      {% for file in pgbouncer_config_files %}
      - file: /etc/pgbouncer/{{ file }}
      {% endfor %}

{{ pillar['app']['path'] }}/schema/env:
  virtualenv.managed:
    - user: {{ pillar['app']['user'] }}
    - group: {{ pillar['app']['group'] }}
    - cwd: {{ pillar['app']['path'] }}/schema
    - requirements: {{ pillar['app']['path'] }}/schema/requirements.txt
    - require:
      - pkg: python-pip
      - pkg: python-dev