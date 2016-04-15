#!/usr/bin/env node

var util = require('util');

var AWS = require('aws-sdk');
var queue = require('d3-queue').queue;

var defaultInstanceTypes = [
    'r3.8xlarge',
    'm4.10xlarge'
];
var defaultRegions = [
    'us-east-1',
    'us-west-2',
    'us-west-1',
    'eu-west-1',
    'eu-central-1',
    'ap-northeast-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'sa-east-1'
];

var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('csv', 'Output csv results to use in spreadsheets')
  .command('stats', 'Output statistics')
  .describe('regions', 'comma-separated list of AWS regions')
  .default('regions', defaultRegions.join(','))
  .describe('instance-types', 'comma-separated list of AWS EC2 instances to look for')
  .default('instance-types', defaultInstanceTypes.join(','))
  .describe('max-price', 'on stats, calculate percentage of time max-price could get a spot instance')
  .describe('hours', 'hours back to look at, min 1, max 90 * 24 = 2160')
  .number('hours')
  .default('hours', 1)
  .demand(1)
  .argv;

function query(region, cb) {
  function queryRecursively(result, next_token) {
    var params = {
      InstanceTypes: argv['instance-types'].split(','),
      Filters: [
        {
          Name: 'product-description',
          Values: [
            'Linux/UNIX'
          ]
        }
      ],
      EndTime: new Date,
      StartTime: (new Date((new Date) - (argv.hours * 60 * 60 * 1000))),
      MaxResults: 1000,
      NextToken: next_token
    };

    new AWS.EC2({
      apiVersion: '2015-10-01',
      region: region
    }).describeSpotPriceHistory(params, function(err, data) {
      if (err) cb(err);

      data.SpotPriceHistory.forEach(function(s) {
        if (!s.AvailabilityZone.match(region)) {
          cb(new Error('Returned Availablity Zone ' + s.AvailabilityZone + ' is not of requested region ' + region));
        };

        // initialize if haven't seen instance type before
        if (!result.prices[s.InstanceType]) result.prices[s.InstanceType] = [];

        result.prices[s.InstanceType].push(s.SpotPrice);
      });

      if (data.NextToken) {
        // recursively continue
        queryRecursively(result);
      } else {
        // finish
        cb(null, result);
      }
    });
  };

  // Start
  queryRecursively({
    region: region,
    prices: {}
  });
};

function csv(results) {
  results.forEach(function(result) {
    for (instanceType in result.prices) {
      console.log("%s-%s,%s", instanceType, result.region, result.prices[instanceType].join(","));
    }
  });
}

function stats(results) {
  // % successfull bids (not outpriced)
  if(argv['max-price']) {
    var successfull = [];
    results.forEach(function(result) {
      for (instanceType in result.prices) {
        var c = result.prices[instanceType].filter(function(v) {
          return v <= argv['max-price'];
        });

        successfull.push({
          region: result.region,
          instanceType: instanceType,
          samples: result.prices[instanceType].length,
          successfull: (c.length / result.prices[instanceType].length)
        });
      }
    });

    successfull.sort(function(a, b) {
      if (a.successfull > b.successfull) return -1;
      if (a.successfull < b.successfull) return 1;
      return 0;
    });

    console.log(successfull);
  }

  // TODO prices: min, max, average, pct 80
};

function execute(cb) {
  var q = queue();

  argv.regions.split(',').forEach(function(r) {
    q.defer(query, r);
  });

  q.awaitAll(function(err, results) {
    if (err) throw err;

    cb(results);
  });
}

if (argv._[0] === 'csv') {
  execute(csv);
} else {
  execute(stats);
};
