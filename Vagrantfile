# -*- mode: ruby -*-
# vi: set ft=ruby :
require 'yaml'
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = "opscode_ubuntu-12.04_chef-provisionerless"

  config.vm.box_url = "http://opscode-vm-bento.s3.amazonaws.com/vagrant/virtualbox/opscode_ubuntu-12.04_chef-provisionerless.box"

  config.vm.network "forwarded_port", guest: 80, host: 8080
  config.vm.network "forwarded_port", guest: 4000, host: 4000
  config.vm.network "forwarded_port", guest: 4001, host: 4001
  config.vm.network "forwarded_port", guest: 4002, host: 4002
  config.vm.network "forwarded_port", guest: 4003, host: 4003
  config.vm.network "forwarded_port", guest: 1080, host: 1080
  config.vm.network "forwarded_port", guest: 1025, host: 1025

  config.vm.synced_folder "provision/salt/", "/srv/salt/"
  config.vm.synced_folder "provision/pillar/", "/srv/pillar/"

  # makes sure that minion config is up to date
  config.vm.provision "shell", inline: "rm -f /etc/salt/minion"
  config.vm.provision "shell", inline: "sudo apt-get install -y -o DPkg::Options::=--force-confold python-pip"
  config.vm.provision "shell", inline: "sudo pip install requests"

  config.vm.provision "salt" do |salt|
    salt.verbose = true
    salt.log_level = "info"
    salt.minion_config = "provision/minion-vagrant"
    salt.run_highstate = true

    salt.install_type = "git"
    salt.install_args = "v2014.7.0"

    pillar = {}
    pillar = pillar.merge(YAML.load_file('provision/pillar/haproxy.sls'))
    pillar = pillar.merge(YAML.load_file('provision/pillar/nodejs.sls'))
    pillar = pillar.merge(YAML.load_file('provision/pillar/pgbouncer.sls'))

    pillar['postgresql'] = {
      "development" => {
        "username" => "vagrant",
        "password" => "vagrant",
        "database" => "vagrant",
        "host" => "127.0.0.1",
        "port" => 6432
      },

      "test" => {
        "username" => "vagrant",
        "password" => "vagrant",
        "database" => "vagrant_test",
        "host" => "127.0.0.1",
        "port" => 6432
      }        
    }

    pillar['redis'] = {
      "version" => "2.8.16",
      "checksum" => "198045c8291dd832788ac8a17d2e565752499942",
      "servers" => {
        "development" => [
          {
            "host" => "127.0.0.1",
            "port" => 6379,
            "requirepass" => "vagrant",
            "save" => [
              [900, 100]
            ],
            "maxmemory" => "64mb"
          },
          {
            "host" => "127.0.0.1",
            "port" => 6380,
            "requirepass" => "vagrant",
            "save" => [
              [900, 100]
            ],
            "maxmemory" => "64mb"
          }
        ],
        "test" => [
          {
            "host" => "127.0.0.1",
            "port" => 6579,
            "requirepass" => "vagrant",
            "save" => [
              [900, 100]
            ],
            "maxmemory" => "64mb"
          },
          {
            "host" => "127.0.0.1",
            "port" => 6580,
            "requirepass" => "vagrant",
            "save" => [
              [900, 100]
            ],
            "maxmemory" => "64mb"
          }
        ]
      },
      "global" => {}
    }

    pillar['app'] = {
      "path" => "/vagrant",
      "user" => "vagrant",
      "group" => "vagrant",
      "session" => {
        "key" => "vagrant",
        "secret" => "vagrant"
      }
    }

    pillar['email'] = {
      "development" => {
        "type" => "smtp",
        "host" => "127.0.0.1",
        "port" => 1025,
        "ignoreTLS" => 1,
        "username" => "",
        "password" => ""
      },

      "test" => {
        "type" => "smtp",
        "host" => "127.0.0.1",
        "port" => 1025,
        "ignoreTLS" => 1,
        "username" => "",
        "password" => ""
      }
    }

    salt.pillar(pillar)
  end
end
