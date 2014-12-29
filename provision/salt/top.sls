base:
  '*':
    - basic
  
  'roles:app':
    - match: grain
    - nodejs

  'roles:postgresql':
    - match: grain
    - postgresql

  'roles:redis':
    - match: grain
    - redis

  'roles:haproxy':
    - match: grain
    - haproxy

  'roles:nginx':
    - match: grain
    - nginx

  'roles:vagrant':
    - match: grain
    - vagrant

  'roles:mailcatcher':
    - match: grain
    - mailcatcher