{% set haproxy_config = pillar.get('haproxy') %}

haproxy_repo:
  pkgrepo.managed:
    - name: deb http://ppa.launchpad.net/vbernat/haproxy-1.5/ubuntu precise main
    - file: /etc/apt/sources.list.d/haproxy.list
    - key_url: http://keyserver.ubuntu.com:11371/pks/lookup?op=get&search=0x505D97A41C61B9CD
haproxy:
  pkg.latest:
    - refresh: True
    - require:
      - pkgrepo: haproxy_repo
  service:
    - running
    - enable: True
    - reload: True
    - require:
      - pkg: haproxy
    - watch:
      - file: /etc/haproxy/haproxy.cfg
      - file: /etc/default/haproxy

/etc/default/haproxy:
  file.managed:
    - source: salt://haproxy/default
    - template: jinja
    - require:
      - pkg: haproxy

/etc/haproxy/haproxy.cfg:
  file.managed:
    - source: salt://haproxy/haproxy.cfg
    - template: jinja
    - context:
      haproxy: {{ haproxy_config }}
    - require:
      - pkg: haproxy