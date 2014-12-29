global_npm_packages:
  cmd.run:
    - user: {{ pillar['app']['user'] }}
    - names:
      - npm install -g supervisor http-server bower grunt-cli po2json mocha jsdoc > /dev/null

schema_packages:
  pkg.installed:
    - names:
      - python-dev
      - python-pip
      - python-virtualenv

{{ pillar['app']['path'] }}/app/translations/env:
  virtualenv.managed:
    - user: {{ pillar['app']['user'] }}
    - group: {{ pillar['app']['group'] }}
    - cwd: {{ pillar['app']['path'] }}/app/translations
    - requirements: {{ pillar['app']['path'] }}/app/translations/requirements.txt
    - require:
      - pkg: schema_packages