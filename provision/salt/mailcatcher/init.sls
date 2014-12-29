mailcatcher_packages:
  pkg.installed:
    - names:
      - libsqlite3-dev
      - sqlite3
      - ruby1.9.3
      - ruby1.9.1-dev

install_mailcatcher:
  cmd.run:
    - user: root
    - name: gem install mailcatcher --no-ri --no-rdoc > /dev/null
    - require:
      - pkg: mailcatcher_packages

/etc/init.d/mailcatcher:
  file.managed:
    - source: salt://mailcatcher/mailcatcher.init
    - template: jinja
    - mode: 755
    - require:
      - cmd: install_mailcatcher

mailcatcher:
  service:
    - running
    - enable: True
    - reload: True
    - require:
      - file: /etc/init.d/mailcatcher