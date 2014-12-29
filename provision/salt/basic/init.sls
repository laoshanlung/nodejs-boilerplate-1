{{ pillar['app']['user'] }}:
  group:
    - present
    - unless:
      - id -u {{ pillar['app']['user'] }}
  user:
    - present
    - gid_from_name: True
    - shell: /bin/bash
    - createhome: True
    - require:
      - group: {{ pillar['app']['group'] }}
    - unless:
      - id -u {{ pillar['app']['user'] }}

basic-packages:
  pkg.installed:
    - names:
      - libssl-dev
      - git-core
      - pkg-config
      - build-essential
      - curl
      - gcc
      - g++
      - checkinstall
      - htop
      - vim
      - wget
      - ca-certificates
      - make
      - python-dev
      - python-pip
      - python-virtualenv
      - python-apt
      - python-software-properties

{% set environments = {
  'development': {},
  'production': {},
  'test': {}
} %}

{% for env, server in pillar.get('postgresql', {}).iteritems() %}
{% do environments.get(env).update(postgresql=server) %}
{% endfor %}

{% for env, server in pillar.get('redis', {}).get('servers', {}).iteritems() %}
{% do environments.get(env).update(redis=server) %}
{% endfor %}

{% for env, email in pillar.get('email', {}).iteritems() %}
{% do environments.get(env).update(email=email) %}
{% endfor %}

{% for env, domain in pillar.get('app', {}).get('domain', {}).iteritems() %}
{% do environments.get(env).update(domain=domain) %}
{% endfor %}

{% for env, admin in pillar.get('app', {}).get('admin', {}).iteritems() %}
{% do environments.get(env).update(admin=admin) %}
{% endfor %}

{% for env, config in environments.iteritems() %}
{% if config|length > 0 %}
{{ pillar['app']['path'] }}/app/config/{{ env }}.json:
  file.managed:
    - source: salt://basic/local.json
    - template: jinja
    - context:
      config: {{ config }}
{% endif %}
{% endfor %}

/etc/environment:
  file.append:
    - text:
      - LC_ALL=en_US.UTF-8
      - LANG=en_US.UTF-8

Etc/UTC:
  timezone.system:
    - utc: True