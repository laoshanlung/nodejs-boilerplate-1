{% set sites = ['static'] %}

nginx_repo:
  pkgrepo.managed:
    - name: deb http://ppa.launchpad.net/nginx/stable/ubuntu precise main 
    - file: /etc/apt/sources.list.d/nginx.list
    - key_url: http://keyserver.ubuntu.com:11371/pks/lookup?op=get&search=0x00A6F0A3C300EE8C
nginx:
  pkg.latest:
    - refresh: True
    - require:
      - pkgrepo: nginx_repo
  service:
    - running
    - enable: True
    - reload: True
    - require:
      - pkg: nginx
    - watch:
      {% for site in sites %}
      - file: /etc/nginx/sites-available/{{ site }}.conf
      - file: /etc/nginx/sites-available/default
      {% endfor %}

{% for site in sites %}
/etc/nginx/sites-available/{{ site }}.conf:
  file.managed:
    - source: salt://nginx/{{ site }}.conf
    - template: jinja
{% endfor %}

{% for site in sites %}
/etc/nginx/sites-enabled/{{ site }}.conf:
  file.symlink:
    - target: /etc/nginx/sites-available/{{ site }}.conf
{% endfor %}

/etc/nginx/sites-available/default:
  file:
    - absent