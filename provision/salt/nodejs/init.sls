{% set app = pillar.get('app') %}
{% set nodejs = pillar.get('nodejs') %}

install_nvm:
  cmd.run:
    - cwd: /home/{{ app.get('user') }}
    - name: curl https://raw.githubusercontent.com/creationix/nvm/v0.16.1/install.sh | bash
    - user: {{ app.get('user') }}
    - require: 
      - pkg: curl
    - unless:
      - ls /home/{{ app.get('user') }}/.nvm

apply_nvm:
  file.append:
    - name: /home/{{ app.get('user') }}/.profile
    - text: source ~/.nvm/nvm.sh
    - user: {{ app.get('user') }}
    - watch:
      - cmd: install_nvm

install_nodejs:
  cmd.run:
    - shell: /bin/bash
    - name: source ~/.nvm/nvm.sh && nvm install {{ nodejs.get('version') }}
    - user: {{ app.get('user') }}
    - require:
      - cmd: install_nvm

set_default_nodejs:
  cmd.run:
    - shell: /bin/bash
    - name: source ~/.nvm/nvm.sh && nvm alias default {{ nodejs.get('version') }}
    - user: {{ app.get('user') }}
    - watch:
      - cmd: install_nvm

install_npm_dependencies:
  cmd.run:
    - cwd: {{ pillar['app']['path'] }}/app
    - user: {{ pillar['app']['user'] }}
    - shell: /bin/bash
    - name: source ~/.nvm/nvm.sh && npm install -d
    - require:
      - cmd: install_nodejs
      - cmd: set_default_nodejs