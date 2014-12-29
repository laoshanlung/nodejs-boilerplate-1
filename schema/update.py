import json
import psycopg2
import sys
import os

from schemup import commands
from schemup.dbs import postgres
from schemup.validator import findSchemaMismatches

try:
    env = sys.argv[1]
except IndexError:
    env = 'development'

# TODO: Put into Schemup
class DictSchema(object):
    def __init__(self, path):
        self.versions = json.load(open(path, "r"))

    def getExpectedTableVersions(self):
        return sorted(self.versions.iteritems())

dbConfig = json.load(open("../app/config/" + env + ".json", "r"))
dbConfig = dbConfig['postgresql']
dbConfigParams = {
    "database": dbConfig["database"],
    "host": dbConfig["host"],
    "user": dbConfig["username"],
    "password": dbConfig["password"],
    "port": dbConfig["port"]
}


pgConn = psycopg2.connect(**dbConfigParams)

pgSchema = postgres.PostgresSchema(pgConn, dryRun=False)

currentDir = os.path.dirname(os.path.realpath(__file__))
dictSchema = DictSchema(os.path.join(currentDir, "versions.json"))

pgSchema.ensureSchemaTable()

# Ensure current DB's integrity
schemaMismatches = findSchemaMismatches(pgSchema)
if schemaMismatches:
    print "Real schema & 'schemup_tables' are out of sync"
    for mismatch in schemaMismatches:
        print mismatch, "\n"
    sys.exit(1)

commands.load('migrations')
sqls = commands.upgrade(pgSchema, dictSchema)

commands.validate(pgSchema, dictSchema)
