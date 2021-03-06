import React, { Component } from 'react';
import PropTypes from 'prop-types';
import * as BackOfficeServices from '../services/BackOfficeServices';
import { ServiceSidebar } from '../components/ServiceSidebar';
import {
  ArrayInput,
  ObjectInput,
  BooleanInput,
  BiColumnBooleanInput,
  LinkDisplay,
  SelectInput,
  TextInput,
  TextareaInput,
  NumberInput,
  FreeDomainInput,
  Help,
  Form,
} from '../components/inputs';
import faker from 'faker';
import deepSet from 'set-value';
import { Collapse } from '../components/inputs/Collapse';
import { createTooltip } from '../tooltips';
import Select from 'react-select';
import { ChaosConfigWithSkin } from '../components/ChaosConfig';
import { JwtVerifier, LocationSettings } from '../components/JwtVerifier';
import { AlgoSettings } from '../components/JwtVerifier';
import { AuthModuleConfig } from '../components/AuthModuleConfig';
import { Proxy } from '../components/Proxy';
import { Warning } from './ScriptsPage';
import { Separator } from '../components/Separator';

function shallowDiffers(a, b) {
  for (let i in a) if (!(i in b)) return true;
  for (let i in b) if (a[i] !== b[i]) return true;
  return false;
}

class CanaryCampaign extends Component {
  state = {
    campaign: null,
  };

  componentDidMount() {
    BackOfficeServices.fetchCanaryCampaign(this.props.serviceId).then(campaign =>
      this.setState({ campaign })
    );
  }

  reset = e => {
    BackOfficeServices.resetCanaryCampaign(this.props.serviceId).then(() => {
      BackOfficeServices.fetchCanaryCampaign(this.props.serviceId).then(campaign =>
        this.setState({ campaign })
      );
    });
  };

  render() {
    return (
      <div className="form-group">
        <label htmlFor={`input-${this.props.label}`} className="col-xs-12 col-sm-2 control-label">
          Campaign stats <Help text="Stats about users target in the current canary campaign" />
        </label>
        {this.state.campaign && (
          <div className="col-sm-10" style={{ paddingTop: 5 }}>
            <span style={{ marginRight: 10 }}>
              {this.state.campaign.canaryUsers + this.state.campaign.standardUsers} users ({
                this.state.campaign.canaryUsers
              }{' '}
              canary / {this.state.campaign.standardUsers} standard)
            </span>
            <button type="button" className="btn btn-danger btn-xs" onClick={this.reset}>
              <i className="glyphicon glyphicon-trash" /> Reset campaign
            </button>
          </div>
        )}
      </div>
    );
  }
}

class CleverSelector extends Component {
  state = {
    services: [],
    select: false,
    value: null,
  };

  componentDidMount() {
    BackOfficeServices.findAllApps().then(services => {
      this.setState({ services });
    });
  }

  onChange = e => {
    let url = e.value;
    url = url.substring(0, url.length - 1);
    this.setState({ select: false });
    if (this.props.onChange) {
      this.props.onChange(url);
    }
  };

  show = () => {
    this.setState({ select: !this.state.select });
  };

  render() {
    if (this.state.select) {
      return (
        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <button
            type="button"
            className="btn btn-danger"
            style={{ marginRight: 10 }}
            onClick={this.show}>
            <i className="glyphicon glyphicon-remove-sign" />
          </button>
          <Select
            style={{ width: 300, zIndex: 9999, border: '1px solid #ccc' }}
            placeholder="Select a target from CleverCloud"
            value={this.state.value}
            options={this.state.services.map(s => ({ label: s.name, value: s.url }))}
            onChange={this.onChange}
          />
        </div>
      );
    }
    return (
      <button type="button" className="btn btn-xs btn-success" onClick={this.show}>
        <i className="glyphicon glyphicon-plus-sign" /> Select a target from CleverCloud
      </button>
    );
  }
}

export class ServicePage extends Component {
  static backOfficeClassName = 'ServicePage';

  state = {
    originalService: null,
    service: null,
    changed: false,
    neverSaved: false,
    allCollapsed: false,
    freeDomain: true,
  };

  toggleCollapsed = e => {
    if (e && e.preventDefault) e.preventDefault();
    this.setState({ allCollapsed: !this.state.allCollapsed }, () => {
      console.log(this.state.allCollapsed);
    });
  };

  sidebarContent(name) {
    return (
      <ServiceSidebar
        env={this.state.service.env}
        serviceId={this.props.params.serviceId}
        name={name}
        nolink
        noSideMenu={this.state.neverSaved}
      />
    );
  }

  load() {
    if (ServicePage.__willCreateService) {
      const service = { ...ServicePage.__willCreateService };
      console.log('create ' + service);
      delete ServicePage.__willCreateService;
      this.props.setTitle(`Service descriptor`);
      this.setState({ service, originalService: service, changed: true, neverSaved: true }, () => {
        this.props.setSidebarContent(this.sidebarContent(service.name));
      });
    } else {
      BackOfficeServices.fetchService(this.props.params.lineId, this.props.params.serviceId).then(
        service => {
          this.props.setTitle(`Service descriptor`);
          this.setState({ service, originalService: service }, () => {
            this.props.setSidebarContent(this.sidebarContent(service.name));
          });
        }
      );
    }
  }

  componentDidMount() {
    this.load();
    this.mountShortcuts();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.params.serviceId !== this.props.params.serviceId) {
      this.load();
    }
  }

  componentWillUnmount() {
    this.unmountShortcuts();
  }

  mountShortcuts = () => {
    document.body.addEventListener('keydown', this.saveShortcut);
  };

  unmountShortcuts = () => {
    document.body.removeEventListener('keydown', this.saveShortcut);
  };

  saveShortcut = e => {
    if (e.keyCode === 83 && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (this.state.changed) {
        this.saveChanges();
      }
    }
  };

  changeTheValue = (name, value) => {
    const serviceClone = _.cloneDeep(this.state.service);
    const newService = deepSet(serviceClone, name, value);
    this.setState({
      changed: shallowDiffers(this.state.originalService, newService),
      service: newService,
    });
  };

  saveChanges = e => {
    if (e && e.preventDefault) e.preventDefault();
    if (this.state.neverSaved) {
      BackOfficeServices.saveService(this.state.service).then(newService => {
        this.setState({
          neverSaved: false,
          changed: false,
          service: newService,
          originalService: newService,
        });
        window.location.reload();
      });
    } else {
      BackOfficeServices.updateService(this.state.service.id, this.state.service).then(
        newService => {
          this.setState({ changed: false, service: newService, originalService: newService });
        }
      );
    }
  };

  exportService = e => {
    if (e && e.preventDefault) e.preventDefault();
    const json = JSON.stringify(this.state.service, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.download = `service-${this.state.service.name}-${this.state.service.env}.json`;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 300);
  };

  changeTargetsValue = value => {
    const targets = value.map(t => {
      if (t.indexOf('://') > -1) {
        const scheme = (t.split('://')[0] || '').replace('://', '');
        const host = (t.split('://')[1] || '').replace('://', '');
        return { scheme, host };
      } else {
        return { scheme: t };
      }
    });
    const newService = { ...this.state.service, targets };
    this.setState({
      changed: shallowDiffers(this.state.originalService, newService),
      service: newService,
    });
  };

  changeCanaryTargetsValue = value => {
    const targets = value.map(t => {
      if (t.indexOf('://') > -1) {
        const scheme = (t.split('://')[0] || '').replace('://', '');
        const host = (t.split('://')[1] || '').replace('://', '');
        return { scheme, host };
      } else {
        return { scheme: t };
      }
    });
    const newService = { ...this.state.service, canary: { ...this.state.service.canary, targets } };
    this.setState({
      changed: shallowDiffers(this.state.originalService, newService),
      service: newService,
    });
  };

  transformTarget = target => {
    if (!target.scheme && !target.host) {
      return '';
    } else if (target.scheme && !target.host && target.host !== '') {
      return target.scheme;
    } else {
      return target.scheme + '://' + target.host;
    }
  };

  deleteService = e => {
    if (e && e.preventDefault) e.preventDefault();
    window
      .newPrompt(`Type the name of the service (${this.state.service.name})to delete it`)
      .then(name => {
        if (name && name === this.state.service.name) {
          BackOfficeServices.deleteService(this.state.service).then(() => {
            window.location.href = `/bo/dashboard/services`;
            // this.props.history.push({
            //   pathname: `/lines/${this.state.service.env}/services`
            // });
          });
        }
      });
  };

  duplicateService = e => {
    if (e && e.preventDefault) e.preventDefault();
    window
      .newConfirm(`Are you sure you want to duplicate ${this.state.service.name} ?`)
      .then(dup => {
        if (dup) {
          BackOfficeServices.createNewService().then(service => {
            const newService = { ...this.state.service };
            newService.id = service.id;
            newService.enabled = false;
            newService.name = newService.name + ' (duplicated)';
            ServicePage.__willCreateService = newService;
            this.props.history.push({
              pathname: `/lines/${newService.env}/services/${newService.id}`,
            });
            // BackOfficeServices.saveService(newService).then(() => {
            //   this.props.history.push({ pathname: `/lines/${newService.env}/services/${newService.id}` });
            //   setTimeout(() => {
            //     window.location.reload();
            //   }, 300);
            // });
          });
        }
      });
  };

  createNewGroup = e => {
    if (e && e.preventDefault) e.preventDefault();
    window.newPrompt('New group name').then(groupName => {
      if (groupName) {
        BackOfficeServices.createGroup({
          id: faker.random.alphaNumeric(64),
          name: groupName,
          description: 'Group named ' + groupName,
        }).then(group => {
          this.setState({ service: { ...this.state.service, groupId: group.id } });
        });
      }
    });
  };

  createDedicatedGroup = e => {
    if (e && e.preventDefault) e.preventDefault();
    const groupName = this.state.service.name + '-group';
    BackOfficeServices.createGroup({
      id: faker.random.alphaNumeric(64),
      name: groupName,
      description: 'Group named ' + groupName,
    }).then(group => {
      this.setState({ service: { ...this.state.service, groupId: group.id } });
    });
  };

  resetCircuitBreaker = e => {
    if (e && e.preventDefault) e.preventDefault();
    fetch(`/bo/api/services/${this.state.service.id}/circuitbreakers`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(r => r.json())
      .then(d => console.log(d));
  };

  canaryToStandard = () => {
    if (this.state.service.canary.enabled && this.state.service.canary.targets.length > 0) {
      const newService = this.state.service;
      newService.targets = newService.canary.targets;
      newService.root = newService.canary.root;
      newService.canary.targets = [];
      newService.canary.root = '/';
      newService.canary.enabled = false;
      this.setState({ service: newService });
    }
  };

  createSelfSignedCert = () => {
    const line = this.state.service.line;
    const value =
      this.state.service.subdomain +
      (line ? (line === 'prod' ? '' : '.' + line) : '') +
      '.' +
      this.state.service.domain;
    BackOfficeServices.selfSignedCert(value).then(cert => {
      window.history.pushState({ cert: cert }, '', `/bo/dashboard/certificates/add`);
    });
  };

  computeIfButtonDisabled = header => {
    return !!this.state.service.additionalHeadersOut[header];
  };

  addSecurityHeader = (header, value) => {
    const service = this.state.service;
    const additionalHeadersOut = service.additionalHeadersOut || {};
    return this.setState({
      service: {
        ...service,
        additionalHeadersOut: {
          ...additionalHeadersOut,
          [header]: value,
        },
      },
    });
  };

  render() {
    if (!this.state.service) return null;
    const propsDisabled = { disabled: true };
    if (this.state.changed) {
      delete propsDisabled.disabled;
    }
    return (
      <div>
        <form className="form-horizontal">
          <div className="form-group btnsService">
            <div className="col-xs-12 col-sm-10 displayGroupBtn">
              <button
                className="btn btn-danger"
                type="button"
                {...createTooltip(
                  'Delete the current service. Will ask for the name of the service to validate.',
                  'left',
                  true
                )}
                onClick={this.deleteService}>
                <i className="glyphicon glyphicon-trash" />
              </button>
              {this.state.allCollapsed && (
                <button
                  className="btn btn-info"
                  type="button"
                  onClick={this.toggleCollapsed}
                  {...createTooltip('Unfold all form groups', 'left', true)}>
                  <i className="glyphicon glyphicon-eye-open" />
                </button>
              )}
              {!this.state.allCollapsed && (
                <button
                  className="btn btn-info"
                  type="button"
                  onClick={this.toggleCollapsed}
                  {...createTooltip('Fold all form groups', 'left', true)}>
                  <i className="glyphicon glyphicon-eye-close" />
                </button>
              )}

              <button
                className="btn btn-info"
                type="button"
                {...createTooltip('Export the current service as a JSON file.', 'left', true)}
                onClick={this.exportService}>
                <i className="glyphicon glyphicon-export" />
              </button>
              <button
                className="btn btn-info"
                type="button"
                {...createTooltip(
                  'Duplicate the current service as a new one to avoid refilling the form with same informations',
                  'left',
                  true
                )}
                onClick={this.duplicateService}>
                <i className="far fa-copy" aria-hidden="true" />
              </button>
              <button
                className="btn btn-save"
                type="button"
                data-toggle="tooltip"
                data-placement="top"
                title="save changes"
                {...createTooltip(
                  'Save current service changes. Works with (Ctrl|Command)+S too',
                  'left',
                  true
                )}
                {...propsDisabled}
                onClick={this.saveChanges}>
                <i className="far fa-save" />
              </button>
            </div>
          </div>
          <TextInput
            label="Id"
            disabled={!this.state.neverSaved}
            placeholder="You service Id"
            value={this.state.service.id}
            onChange={v => this.changeTheValue('id', v)}
            help="A unique random string to identify your service"
          />
          <SelectInput
            label="Group"
            placeholder="Your service group"
            value={this.state.service.groupId}
            onChange={v => this.changeTheValue('groupId', v)}
            valuesFrom="/bo/api/proxy/api/groups"
            transformer={a => ({ value: a.id, label: a.name })}
            help="Each service descriptor is attached to a group. A group can have one or more services. Each API key is linked to a group and allow access to every service in the group."
          />
          <div className="form-group">
            <label className="col-xs-12 col-sm-2 control-label" />
            <div className="col-sm-10">
              <button
                type="button"
                className="btn btn-success pull-right btn-xs"
                {...createTooltip('You can create a new group to host this descriptor')}
                onClick={this.createNewGroup}>
                <i className="glyphicon glyphicon-plus" /> Create a new group
              </button>
              <button
                type="button"
                className="btn btn-success pull-right btn-xs"
                style={{ marginRight: 5 }}
                {...createTooltip(
                  'You can create a new group with an auto generated name to host this descriptor'
                )}
                onClick={this.createDedicatedGroup}>
                <i className="glyphicon glyphicon-plus" /> Create dedicated group
              </button>
            </div>
          </div>
          <TextInput
            label="Name"
            placeholder="Your service name"
            value={this.state.service.name}
            help="The name of your service. Only for debug and human readability purposes."
            onChange={e => this.changeTheValue('name', e)}
          />
          <Collapse collapsed={this.state.allCollapsed} initCollapsed={false} label="Flags">
            <div className="row">
              <div className="col-md-6">
                <BiColumnBooleanInput
                  label="Service enabled"
                  value={this.state.service.enabled}
                  help="Activate or deactivate your service. Once disabled, users will get an error page saying the service does not exist."
                  onChange={v => this.changeTheValue('enabled', v)}
                />
                <BiColumnBooleanInput
                  label="Read only mode"
                  value={this.state.service.readOnly}
                  help="Authorize only GET, HEAD, OPTIONS calls on this service "
                  onChange={v => this.changeTheValue('readOnly', v)}
                />
                <BiColumnBooleanInput
                  label="Maintenance mode"
                  value={this.state.service.maintenanceMode}
                  help="Display a maintainance page when a user try to use the service"
                  onChange={v => this.changeTheValue('maintenanceMode', v)}
                />
                <BiColumnBooleanInput
                  label="Construction mode"
                  value={this.state.service.buildMode}
                  help="Display a construction page when a user try to use the service"
                  onChange={v => this.changeTheValue('buildMode', v)}
                />
              </div>
              <div className="col-md-6">
                <BiColumnBooleanInput
                  label="Send Otoroshi headers back"
                  value={this.state.service.sendOtoroshiHeadersBack}
                  help="When enabled, Otoroshi will send headers to consumer like request id, client latency, overhead, etc ..."
                  onChange={v => this.changeTheValue('sendOtoroshiHeadersBack', v)}
                />
                <BiColumnBooleanInput
                  label="Override Host header"
                  value={this.state.service.overrideHost}
                  help="When enabled, Otoroshi will automatically set the Host header to corresponding target host"
                  onChange={v => this.changeTheValue('overrideHost', v)}
                />
                <BiColumnBooleanInput
                  label="Send X-Forwarded-* headers"
                  value={this.state.service.xForwardedHeaders}
                  help="When enabled, Otoroshi will send X-Forwarded-* headers to target"
                  onChange={v => this.changeTheValue('xForwardedHeaders', v)}
                />
                <BiColumnBooleanInput
                  label="Force HTTPS"
                  value={this.state.service.forceHttps}
                  help="Will force redirection to https:// if not present"
                  onChange={v => this.changeTheValue('forceHttps', v)}
                />
                <BiColumnBooleanInput
                  label="Allow HTTP/1.0 requests"
                  value={this.state.service.allowHttp10}
                  help="Will return an error on HTTP/1.0 request"
                  onChange={v => this.changeTheValue('allowHttp10', v)}
                />
              </div>
            </div>
          </Collapse>
          <Collapse
            collapsed={this.state.allCollapsed}
            initCollapsed={false}
            label="Service exposition settings">
            {this.state.freeDomain && (
              <FreeDomainInput
                label="Exposed domain"
                placeholder="(http|https)://subdomain?.env?.domain.tld?/root?"
                help="The domain used to expose your service. Should follow pattern: (http|https)://subdomain?.env?.domain.tld?/root? or regex (http|https):\/\/(.*?)\.?(.*?)\.?(.*?)\.?(.*)\/?(.*)"
                value={this.state.service}
                onChange={newService => {
                  this.setState({
                    changed: shallowDiffers(this.state.originalService, newService),
                    service: newService,
                  });
                }}
              />
            )}
            {!this.state.freeDomain && (
              <TextInput
                label="Subdomain"
                placeholder="The subdomain on which the service is available"
                value={this.state.service.subdomain}
                help="The subdomain on which the service is available"
                onChange={e => this.changeTheValue('subdomain', e)}
              />
            )}
            {!this.state.freeDomain && (
              <SelectInput
                label="Line"
                placeholder="The line on which the service is available"
                value={this.state.service.env}
                onChange={e => this.changeTheValue('env', e)}
                valuesFrom="/bo/api/proxy/api/lines"
                help="The line on which the service is available. Based on that value, the name of the line will be appended to the subdomain. For line prod, nothing will be appended. For example, if the subdomain is 'foo' and line is 'preprod', then the exposed service will be available at 'foo.preprod.mydomain'"
                transformer={v => ({ value: v, label: v })}
              />
            )}
            {!this.state.freeDomain && (
              <TextInput
                label="Domain"
                placeholder="The domain on which the service is available"
                value={this.state.service.domain}
                help="The domain on which the service is available."
                onChange={e => this.changeTheValue('domain', e)}
              />
            )}
            {!this.state.freeDomain && (
              <TextInput
                label="Matching root"
                placeholder="The root path on which the service is available"
                value={this.state.service.matchingRoot}
                help="The root path on which the service is available"
                onChange={e => this.changeTheValue('matchingRoot', e)}
              />
            )}
            <div className="form-group">
              <label className="col-xs-12 col-sm-2 control-label" />
              <div className="col-sm-10">
                <button
                  className="btn btn-xs btn-info"
                  type="button"
                  onClick={e => {
                    e.preventDefault();
                    this.setState({ freeDomain: !this.state.freeDomain });
                  }}>
                  {this.state.freeDomain ? 'exposed domain assistant' : 'exposed domain free input'}
                </button>
                {!this.state.neverSaved && (
                  <button
                    type="button"
                    onClick={this.createSelfSignedCert}
                    className="btn btn-xs btn-info">
                    <i className="glyphicon glyphicon-plus-sign" /> Create self signed cert.
                  </button>
                )}
                {/*!this.state.neverSaved && (
                  <button type="button" disabled className="btn btn-xs btn-info">
                    <i className="glyphicon glyphicon-plus-sign" /> Create Let's Encrypt cert.
                  </button>
                )*/}
              </div>
            </div>
            {this.state.service.env === 'prod' &&
              this.state.service.subdomain.trim().length === 0 && (
                <LinkDisplay
                  link={`${this.state.service.forceHttps ? 'https' : 'http'}://${
                    this.state.service.domain
                  }${this.state.service.matchingRoot || ''}/`}
                />
              )}
            {this.state.service.env === 'prod' &&
              this.state.service.subdomain.trim().length > 0 && (
                <LinkDisplay
                  link={`${this.state.service.forceHttps ? 'https' : 'http'}://${
                    this.state.service.subdomain
                  }.${this.state.service.domain}${this.state.service.matchingRoot || ''}/`}
                />
              )}
            {this.state.service.env !== 'prod' && (
              <LinkDisplay
                link={`${this.state.service.forceHttps ? 'https' : 'http'}://${
                  this.state.service.subdomain
                }.${this.state.service.env}.${this.state.service.domain}${this.state.service
                  .matchingRoot || ''}/`}
              />
            )}
          </Collapse>
          <Collapse
            collapsed={this.state.allCollapsed}
            initCollapsed={
              !this.state.service.redirection ? this.state.service.redirection.enabled : false
            }
            label="Redirection">
            <BooleanInput
              label="Redirection enabled"
              value={
                this.state.service.redirection ? this.state.service.redirection.enabled : false
              }
              help="..."
              onChange={v => this.changeTheValue('redirection.enabled', v)}
            />
            <SelectInput
              label="Http redirection code"
              value={this.state.service.redirection ? this.state.service.redirection.code : '302'}
              onChange={e => this.changeTheValue('redirection.code', e)}
              possibleValues={[
                {
                  label: '301: Moved Permanently',
                  value: 301,
                },
                {
                  label: '302: Found',
                  value: 302,
                },
                {
                  label: '303: See Other',
                  value: 303,
                },
                {
                  label: '307: Temporary Redirect',
                  value: 307,
                },
                {
                  label: '308: Permanent Redirect',
                  value: 308,
                },
              ]}
              help="..."
            />
            <TextInput
              label="Redirect to"
              placeholder="Redirection location"
              value={this.state.service.redirection.to}
              help="..."
              onChange={e => this.changeTheValue('redirection.to', e)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={false}
            label="Service targets">
            <BooleanInput
              label="Redirect to local"
              value={this.state.service.redirectToLocal}
              help="If you work locally with Otoroshi, you may want to use that feature to redirect one specific service to a local host. For example, you can relocate https://foo.preprod.bar.com to http://localhost:8080 to make some tests"
              onChange={v => this.changeTheValue('redirectToLocal', v)}
              after={() => {
                if (this.props.env && this.props.env.clevercloud) {
                  return (
                    <CleverSelector
                      onChange={url => {
                        const targets = [...this.state.service.targets];
                        const parts = url.split('://');
                        targets[0].host = parts[1];
                        targets[0].scheme = parts[0];
                        const newService = { ...this.state.service, targets };
                        this.setState({
                          service: newService,
                          changed: shallowDiffers(this.state.originalService, newService),
                        });
                      }}
                    />
                  );
                } else {
                  return null;
                }
              }}
            />
            {!this.state.service.redirectToLocal && (
              <div>
                <ArrayInput
                  label="Targets"
                  placeholder="Target URL"
                  value={this.state.service.targets.map(this.transformTarget)}
                  help="The list of target that Otoroshi will proxy and expose through the subdomain defined before. Otoroshi will do round-robin load balancing between all those targets with circuit breaker mecanism to avoid cascading failures"
                  onChange={this.changeTargetsValue}
                />
              </div>
            )}
            {this.state.service.redirectToLocal && (
              <div>
                <TextInput
                  label="Local scheme"
                  placeholder="The scheme of the local service"
                  value={this.state.service.localScheme}
                  help="The scheme used localy, mainly http"
                  onChange={e => this.changeTheValue('localScheme', e)}
                />
                <TextInput
                  label="Local host"
                  placeholder="The host of the local service"
                  value={this.state.service.localHost}
                  help="The host used localy, mainly localhost:xxxx"
                  onChange={e => this.changeTheValue('localHost', e)}
                />
              </div>
            )}
            <TextInput
              label="Targets root"
              placeholder="The root URL of the target service"
              value={this.state.service.root}
              help="Otoroshi will append this root to any target choosen. If the specified root is '/api/foo', then a request to https://yyyyyyy/bar will actually hit https://xxxxxxxxx/api/foo/bar"
              onChange={e => this.changeTheValue('root', e)}
            />
            <LinkDisplay
              link={`${this.state.service.targets[0].scheme}://${
                this.state.service.targets[0].host
              }${this.state.service.root}`}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={false}
            label="URL Patterns">
            <div className="form-group">
              <label className="col-xs-12 col-sm-2 control-label" />
              <div className="col-sm-10">
                <PublicUiButton
                  value={this.state.service.publicPatterns}
                  onChange={arr => this.changeTheValue('publicPatterns', arr)}
                />
                <PrivateApiButton
                  value={this.state.service.privatePatterns}
                  onChange={arr => this.changeTheValue('privatePatterns', arr)}
                />
              </div>
            </div>
            <ArrayInput
              label="Public patterns"
              placeholder="URI pattern"
              suffix="regex"
              value={this.state.service.publicPatterns}
              help="By default, every services are private only and you'll need an API key to access it. However, if you want to expose a public UI, you can define one or more public patterns (regex) to allow access to anybody. For example if you want to allow anybody on any URL, just use '/.*'"
              onChange={arr => this.changeTheValue('publicPatterns', arr)}
            />
            <ArrayInput
              label="Private patterns"
              placeholder="URI pattern"
              suffix="regex"
              value={this.state.service.privatePatterns}
              help="If you define a public pattern that is a little bit too much, you can make some of public URL private again"
              onChange={arr => this.changeTheValue('privatePatterns', arr)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Otoroshi exchange protocol">
            <BooleanInput
              label="Enabled"
              value={this.state.service.enforceSecureCommunication}
              help="When enabled, Otoroshi will try to exchange headers with downstream service to ensure no one else can use the service from outside."
              onChange={v => this.changeTheValue('enforceSecureCommunication', v)}
            />
            <BooleanInput
              label="Send challenge"
              value={this.state.service.sendStateChallenge}
              help="When disbaled, Otoroshi will not check if target service respond with sent random value."
              onChange={v => this.changeTheValue('sendStateChallenge', v)}
            />
            <SelectInput
              label="Challenge version"
              value={this.state.service.secComVersion}
              help="Version the otoroshi exchange protocol challenge. This option will be set to V2 in a near future."
              onChange={arr => this.changeTheValue('secComVersion', arr)}
              possibleValues={[
                { label: 'V1 - simple values exchange', value: 1 },
                { label: 'V2 - signed JWT tokens exchange', value: 2 },
              ]}
            />
            <ArrayInput
              label="Excluded patterns"
              placeholder="URI pattern"
              suffix="regex"
              value={this.state.service.secComExcludedPatterns}
              help="URI patterns excluded from the otoroshi exchange protocol"
              onChange={arr => this.changeTheValue('secComExcludedPatterns', arr)}
            />
            <AlgoSettings
              algo={this.state.service.secComSettings}
              path="secComSettings"
              changeTheValue={this.changeTheValue}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Authentication">
            <BooleanInput
              label="Enforce user authentication"
              value={this.state.service.privateApp}
              help="When enabled, user will be allowed to use the service (UI) only if they are registered users of the chosen authentication module."
              onChange={v => this.changeTheValue('privateApp', v)}
            />
            <SelectInput
              label="Auth. config"
              value={this.state.service.authConfigRef}
              onChange={e => this.changeTheValue('authConfigRef', e)}
              valuesFrom="/bo/api/proxy/api/auths"
              transformer={a => ({ value: a.id, label: a.name })}
              help="..."
            />
            <div className="form-group">
              <label className="col-xs-12 col-sm-2 control-label" />
              <div className="col-sm-10">
                {!this.state.service.authConfigRef && (
                  <a href={`/bo/dashboard/auth-configs/add`} className="btn btn-sm btn-primary">
                    <i className="glyphicon glyphicon-plus" /> Create a new auth. config.
                  </a>
                )}
                {this.state.service.authConfigRef && (
                  <a
                    href={`/bo/dashboard/auth-configs/edit/${this.state.service.authConfigRef}`}
                    className="btn btn-sm btn-success">
                    <i className="glyphicon glyphicon-edit" /> Edit the auth. config.
                  </a>
                )}
                <a href={`/bo/dashboard/auth-configs`} className="btn btn-sm btn-primary">
                  <i className="glyphicon glyphicon-link" /> all auth. config.
                </a>
              </div>
            </div>
            <ArrayInput
              label="Excluded patterns"
              placeholder="URI pattern"
              suffix="regex"
              value={this.state.service.securityExcludedPatterns}
              help="By default, when security is enabled, everything is secured. But sometimes you need to exlude something, so just add regex to matching path you want to exlude."
              onChange={arr => this.changeTheValue('securityExcludedPatterns', arr)}
            />
            <BooleanInput
              label="Strict mode"
              value={this.state.service.strictlyPrivate}
              help="Strict mode enabled"
              onChange={v => this.changeTheValue('strictlyPrivate', v)}
            />
            <div className="form-group">
              <label className="col-xs-12 col-sm-2 control-label" />
              <div className="col-sm-10">
                <p
                  style={{
                    padding: 10,
                    borderRadius: 5,
                    backgroundColor: '#494948',
                    width: '100%',
                  }}>
                  When an app. enforces user authentication (ex. privateApp), it can be nice to
                  allow logged users to access apps API without using an apikey (because the user is
                  logged in, the app is exposing UI and API and we don't want to leak apikeys). By
                  default Otoroshi allow this for historical reasons, but it means that you have
                  anticipate that sometimes your api will be called whitout an apikey. If you don't
                  want this behavior, juste enable the strict mode.
                </p>
              </div>
            </div>
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Api Keys Constraints">
            <BooleanInput
              label="From basic auth."
              value={this.state.service.apiKeyConstraints.basicAuth.enabled}
              help="You can pass the api key in Authorization header (ie. from 'Authorization: Basic xxx' header)"
              onChange={v => this.changeTheValue('apiKeyConstraints.basicAuth.enabled', v)}
            />
            <BooleanInput
              label="Allow client id only usage"
              value={this.state.service.apiKeyConstraints.clientIdAuth.enabled}
              help="You can pass the api key using client id only (ie. from Otoroshi-Token header)"
              onChange={v => this.changeTheValue('apiKeyConstraints.clientIdAuth.enabled', v)}
            />
            <BooleanInput
              label="From custom headers"
              value={this.state.service.apiKeyConstraints.customHeadersAuth.enabled}
              help="You can pass the api key using custom headers (ie. Otoroshi-Client-Id and Otoroshi-Client-Secret headers)"
              onChange={v => this.changeTheValue('apiKeyConstraints.customHeadersAuth.enabled', v)}
            />
            <BooleanInput
              label="From JWT token"
              value={this.state.service.apiKeyConstraints.jwtAuth.enabled}
              help="You can pass the api key using a JWT token (ie. from 'Authorization: Bearer xxx' header)"
              onChange={v => this.changeTheValue('apiKeyConstraints.jwtAuth.enabled', v)}
            />
            <Separator title="Basic auth. Api Key" />
            <TextInput
              label="Custom header name"
              value={this.state.service.apiKeyConstraints.basicAuth.headerName}
              help="The name of the header to get Authorization"
              placeholder="Authorization"
              onChange={v => this.changeTheValue('apiKeyConstraints.basicAuth.headerName', v)}
            />
            <TextInput
              label="Custom query param name"
              value={this.state.service.apiKeyConstraints.basicAuth.queryName}
              help="The name of the query param to get Authorization"
              placeholder="basic_auth"
              onChange={v => this.changeTheValue('apiKeyConstraints.basicAuth.queryName', v)}
            />
            <Separator title="Client Id only Api Key" />
            <TextInput
              label="Custom header name"
              value={this.state.service.apiKeyConstraints.clientIdAuth.headerName}
              help="The name of the header to get the client id"
              placeholder="x-api-key"
              onChange={v => this.changeTheValue('apiKeyConstraints.clientIdAuth.headerName', v)}
            />
            <TextInput
              label="Custom query param name"
              value={this.state.service.apiKeyConstraints.clientIdAuth.queryName}
              help="The name of the query param to get the client id"
              placeholder="x-api-key"
              onChange={v => this.changeTheValue('apiKeyConstraints.clientIdAuth.queryName', v)}
            />
            <Separator title="Custom headers Api Key" />
            <TextInput
              label="Custom client id header name"
              value={this.state.service.apiKeyConstraints.customHeadersAuth.clientIdHeaderName}
              help="The name of the header to get the client id"
              placeholder="Otoroshi-Client-Id"
              onChange={v =>
                this.changeTheValue('apiKeyConstraints.customHeadersAuth.clientIdHeaderName', v)
              }
            />
            <TextInput
              label="Custom client secret header name"
              value={this.state.service.apiKeyConstraints.customHeadersAuth.clientSecretHeaderName}
              help="The name of the header to get the client secret"
              placeholder="Otoroshi-Client-Secret"
              onChange={v =>
                this.changeTheValue('apiKeyConstraints.customHeadersAuth.clientSecretHeaderName', v)
              }
            />
            <Separator title="JWT Token Api Key" />
            <BooleanInput
              label="Include Http request attrs."
              value={this.state.service.apiKeyConstraints.jwtAuth.includeRequestAttributes}
              help="If enabled, you have to put the following fields in the JWT token corresponding to the current http call (httpPath, httpVerb, httpHost)"
              onChange={v =>
                this.changeTheValue('apiKeyConstraints.jwtAuth.includeRequestAttributes', v)
              }
            />
            <NumberInput
              label="Max accepted token lifetime"
              value={this.state.service.apiKeyConstraints.jwtAuth.maxJwtLifespanSecs}
              help="The maximum number of second accepted as token lifespan"
              suffix="seconds"
              onChange={v => this.changeTheValue('apiKeyConstraints.jwtAuth.maxJwtLifespanSecs', v)}
            />
            <TextInput
              label="Custom header name"
              value={this.state.service.apiKeyConstraints.jwtAuth.headerName}
              help="The name of the header to get the jwt token"
              placeholder="Authorization or Otoroshi-Token"
              onChange={v => this.changeTheValue('apiKeyConstraints.jwtAuth.headerName', v)}
            />
            <TextInput
              label="Custom query param name"
              value={this.state.service.apiKeyConstraints.jwtAuth.queryName}
              help="The name of the query param to get the jwt token"
              placeholder="access_token"
              onChange={v => this.changeTheValue('apiKeyConstraints.jwtAuth.queryName', v)}
            />
            <TextInput
              label="Custom cookie name"
              value={this.state.service.apiKeyConstraints.jwtAuth.cookieName}
              help="The name of the cookie to get the jwt token"
              placeholder="access_token"
              onChange={v => this.changeTheValue('apiKeyConstraints.jwtAuth.cookieName', v)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Third party Api Keys">
            <SelectInput
              label="Type"
              value={this.state.service.thirdPartyApiKey.type}
              possibleValues={[{ label: 'OpenID Connect JWT tokens', value: 'OIDC' }]}
              help="..."
            />
            {this.state.service.thirdPartyApiKey.type === 'OIDC' && (
              <div>
                <BooleanInput
                  label="Enabled"
                  value={this.state.service.thirdPartyApiKey.enabled}
                  help="..."
                  onChange={v => this.changeTheValue('thirdPartyApiKey.enabled', v)}
                />
                <SelectInput
                  label="Mode"
                  value={this.state.service.thirdPartyApiKey.mode}
                  onChange={e => this.changeTheValue('thirdPartyApiKey.mode', e)}
                  possibleValues={[
                    { value: 'Tmp', label: 'Temporary api keys (api keys will not be stored)' },
                    {
                      value: 'Hybrid',
                      label:
                        'Hybrid api keys (api keys will not be stored, but will be used if they already exists)',
                    },
                    { value: 'Persistent', label: 'Persistent api keys (will be stored)' },
                  ]}
                  help="..."
                />
                <SelectInput
                  label="OIDC config"
                  value={this.state.service.thirdPartyApiKey.oidcConfigRef}
                  onChange={e => this.changeTheValue('thirdPartyApiKey.oidcConfigRef', e)}
                  valuesFrom="/bo/api/proxy/api/auths"
                  transformer={a => ({ value: a.id, label: a.name })}
                  help="..."
                />
                <div className="form-group">
                  <label className="col-xs-12 col-sm-2 control-label" />
                  <div className="col-sm-10">
                    {!this.state.service.thirdPartyApiKey.oidcConfigRef && (
                      <a href={`/bo/dashboard/auth-configs/add`} className="btn btn-sm btn-primary">
                        <i className="glyphicon glyphicon-plus" /> Create a new auth. config.
                      </a>
                    )}
                    {this.state.service.thirdPartyApiKey.oidcConfigRef && (
                      <a
                        href={`/bo/dashboard/auth-configs/edit/${
                          this.state.service.thirdPartyApiKey.oidcConfigRef
                        }`}
                        className="btn btn-sm btn-success">
                        <i className="glyphicon glyphicon-edit" /> Edit the auth. config.
                      </a>
                    )}
                    <a href={`/bo/dashboard/auth-configs`} className="btn btn-sm btn-primary">
                      <i className="glyphicon glyphicon-link" /> all auth. config.
                    </a>
                  </div>
                </div>
                <Separator title="Verification" />
                <BooleanInput
                  label="Local verif. only"
                  value={this.state.service.thirdPartyApiKey.localVerificationOnly}
                  help="Validate token only localy"
                  onChange={v => this.changeTheValue('thirdPartyApiKey.localVerificationOnly', v)}
                />
                <NumberInput
                  label="Introspection cache TTL"
                  suffix="ms."
                  value={this.state.service.thirdPartyApiKey.ttl}
                  help="TTL for the introspection cache"
                  onChange={v => this.changeTheValue('thirdPartyApiKey.ttl', v)}
                />
                <TextInput
                  label="Bearer header name"
                  value={this.state.service.thirdPartyApiKey.headerName}
                  help="The name of the header containing the bearer"
                  onChange={v => this.changeTheValue('thirdPartyApiKey.headerName', v)}
                />
                <ArrayInput
                  label="Scopes validation"
                  placeholder="scope"
                  value={this.state.service.thirdPartyApiKey.scopes}
                  help="..."
                  onChange={v => this.changeTheValue('thirdPartyApiKey.scopes', v)}
                />
                <ArrayInput
                  label="Role paths"
                  placeholder="path"
                  value={this.state.service.thirdPartyApiKey.rolesPath}
                  help="..."
                  onChange={v => this.changeTheValue('thirdPartyApiKey.rolesPath', v)}
                />
                <ArrayInput
                  label="Roles validation"
                  placeholder="role"
                  value={this.state.service.thirdPartyApiKey.roles}
                  help="..."
                  onChange={v => this.changeTheValue('thirdPartyApiKey.roles', v)}
                />
                <Separator title="Quotas" />
                <BooleanInput
                  label="Use quotas"
                  value={this.state.service.thirdPartyApiKey.quotasEnabled}
                  help="Apply quotas policy on each individual token"
                  onChange={v => this.changeTheValue('thirdPartyApiKey.quotasEnabled', v)}
                />
                <BooleanInput
                  label="Unique Api Key"
                  value={this.state.service.thirdPartyApiKey.uniqueApiKey}
                  help="Any individual token is backed by a unique Api Key"
                  onChange={v => this.changeTheValue('thirdPartyApiKey.quotasEnabled', v)}
                />
                <NumberInput
                  label="Throttling"
                  suffix="Calls per second"
                  value={this.state.service.thirdPartyApiKey.throttlingQuota}
                  help="..."
                  onChange={v => this.changeTheValue('thirdPartyApiKey.throttlingQuota', v)}
                />
                <NumberInput
                  label="Daily quota"
                  suffix="Calls per day"
                  value={this.state.service.thirdPartyApiKey.dailyQuota}
                  help="..."
                  onChange={v => this.changeTheValue('thirdPartyApiKey.dailyQuota', v)}
                />
                <NumberInput
                  label="Monthly quota"
                  suffix="Calls per month"
                  value={this.state.service.thirdPartyApiKey.monthlyQuota}
                  help="..."
                  onChange={v => this.changeTheValue('thirdPartyApiKey.monthlyQuota', v)}
                />
                <Separator />
                <ArrayInput
                  label="Excluded patterns"
                  placeholder="URI pattern"
                  suffix="regex"
                  value={this.state.service.thirdPartyApiKey.excludedPatterns}
                  help="..."
                  onChange={v => this.changeTheValue('thirdPartyApiKey.excludedPatterns', v)}
                />
              </div>
            )}
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="CORS support">
            <BooleanInput
              label="Enabled"
              value={this.state.service.cors.enabled}
              help="..."
              onChange={v => this.changeTheValue('cors.enabled', v)}
            />
            <BooleanInput
              label="Allow credentials"
              value={this.state.service.cors.allowCredentials}
              help="..."
              onChange={v => this.changeTheValue('cors.allowCredentials', v)}
            />
            <TextInput
              label="Allow origin"
              value={this.state.service.cors.allowOrigin}
              help="..."
              onChange={v => this.changeTheValue('cors.allowOrigin', v)}
            />
            <NumberInput
              label="Max age"
              value={this.state.service.cors.maxAge}
              help="..."
              onChange={v => this.changeTheValue('cors.maxAge', v)}
            />
            <ArrayInput
              label="Expose headers"
              value={this.state.service.cors.exposeHeaders}
              help="..."
              onChange={v => this.changeTheValue('cors.exposeHeaders', v)}
            />
            <ArrayInput
              label="Allow headers"
              value={this.state.service.cors.allowHeaders}
              help="..."
              onChange={v => this.changeTheValue('cors.allowHeaders', v)}
            />
            <ArrayInput
              label="Allow methods"
              value={this.state.service.cors.allowMethods}
              help="..."
              onChange={v => this.changeTheValue('cors.allowMethods', v)}
            />
            <ArrayInput
              label="Excluded patterns"
              placeholder="URI pattern"
              suffix="regex"
              value={this.state.service.cors.excludedPatterns}
              help="By default, when cors is enabled, everything has cors. But sometimes you need to exlude something, so just add regex to matching path you want to exlude."
              onChange={arr => this.changeTheValue('cors.excludedPatterns', arr)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="JWT tokens verification">
            <SelectInput
              label="Type"
              value={this.state.service.jwtVerifier.type}
              onChange={e => {
                switch (e) {
                  case 'local':
                    this.changeTheValue('jwtVerifier', JwtVerifier.defaultVerifier);
                    break;
                  case 'ref':
                    this.changeTheValue('jwtVerifier', {
                      type: 'ref',
                      enabled: this.state.service.jwtVerifier.enabled,
                      id: null,
                    });
                    break;
                }
              }}
              possibleValues={[
                { label: 'Local to service descriptor', value: 'local' },
                { label: 'Reference to global definition', value: 'ref' },
              ]}
              help="..."
            />
            {this.state.service.jwtVerifier.type === 'ref' && (
              <div>
                <SelectInput
                  label="Verifier"
                  value={this.state.service.jwtVerifier.id}
                  onChange={e => this.changeTheValue('jwtVerifier.id', e)}
                  valuesFrom="/bo/api/proxy/api/verifiers"
                  transformer={a => ({ value: a.id, label: a.name })}
                  help="..."
                />
                <BooleanInput
                  label="Enabled"
                  value={this.state.service.jwtVerifier.enabled}
                  help="Is JWT verification enabled for this service"
                  onChange={v => this.changeTheValue('jwtVerifier.enabled', v)}
                />
                <div className="form-group">
                  <label className="col-xs-12 col-sm-2 control-label" />
                  <div className="col-sm-10">
                    {!this.state.service.jwtVerifier.id && (
                      <a href={`/bo/dashboard/jwt-verifiers/add`} className="btn btn-primary">
                        <i className="glyphicon glyphicon-plus" /> Create a new Jwt Verifier config
                      </a>
                    )}
                    {this.state.service.jwtVerifier.id && (
                      <a
                        href={`/bo/dashboard/jwt-verifiers/edit/${
                          this.state.service.jwtVerifier.id
                        }`}
                        className="btn btn-success">
                        <i className="glyphicon glyphicon-edit" /> Edit the global Jwt Verifier
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
            {this.state.service.jwtVerifier.type === 'local' && (
              <JwtVerifier
                path="jwtVerifier"
                changeTheValue={this.changeTheValue}
                verifier={this.state.service.jwtVerifier}
              />
            )}
            <ArrayInput
              label="Excluded patterns"
              placeholder="URI pattern"
              suffix="regex"
              value={this.state.service.jwtVerifier.excludedPatterns}
              help="By default, when jwt verification is enabled, everything is verified. But sometimes you need to exclude something, so just add regex to matching path you want to exlude."
              onChange={v => this.changeTheValue('jwtVerifier.excludedPatterns', v)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Validation authority">
            <SelectInput
              label="Validation authority"
              value={this.state.service.clientValidatorRef}
              onChange={e => this.changeTheValue('clientValidatorRef', e)}
              valuesFrom="/bo/api/proxy/api/client-validators"
              transformer={a => ({ value: a.id, label: a.name })}
              help="..."
            />
            <div className="form-group">
              <label className="col-xs-12 col-sm-2 control-label" />
              <div className="col-sm-10">
                {!this.state.service.clientValidatorRef && (
                  <a
                    href={`/bo/dashboard/validation-authorities/add`}
                    className="btn btn-sm btn-primary">
                    <i className="glyphicon glyphicon-plus" /> Create a new validation authority.
                  </a>
                )}
                {this.state.service.clientValidatorRef && (
                  <a
                    href={`/bo/dashboard/validation-authorities/edit/${
                      this.state.service.clientValidatorRef
                    }`}
                    className="btn btn-sm btn-success">
                    <i className="glyphicon glyphicon-edit" /> Edit the validation authority.
                  </a>
                )}
                <a href={`/bo/dashboard/validation-authorities`} className="btn btn-sm btn-primary">
                  <i className="glyphicon glyphicon-link" /> all validation authorities.
                </a>
              </div>
            </div>
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Gzip support">
            <BooleanInput
              label="Enabled"
              value={this.state.service.gzip.enabled}
              help="..."
              onChange={v => this.changeTheValue('gzip.enabled', v)}
            />
            <ArrayInput
              label="Mimetypes whitelist"
              placeholder="text/html"
              suffix="pattern"
              value={this.state.service.gzip.whiteList}
              help="..."
              onChange={arr => this.changeTheValue('gzip.whiteList', arr)}
            />
            <ArrayInput
              label="Mimetypes blacklist"
              placeholder="text/html"
              suffix="pattern"
              value={this.state.service.gzip.blacklist}
              help="..."
              onChange={arr => this.changeTheValue('gzip.blacklist', arr)}
            />
            <NumberInput
              label="Compression level"
              value={this.state.service.gzip.compressionLevel}
              help="..."
              suffix="0 to 9"
              from="0"
              to="9"
              onChange={v => this.changeTheValue('gzip.compressionLevel', v)}
            />
            <NumberInput
              label="Buffer size"
              value={this.state.service.gzip.bufferSize}
              help="..."
              suffix="bytes"
              onChange={v => this.changeTheValue('gzip.bufferSize', v)}
            />
            <NumberInput
              label="Chunk threshold"
              value={this.state.service.gzip.chunkedThreshold}
              help="..."
              suffix="bytes"
              onChange={v => this.changeTheValue('gzip.chunkedThreshold', v)}
            />
            <ArrayInput
              label="Excluded patterns"
              placeholder="URI pattern"
              suffix="regex"
              value={this.state.service.gzip.excludedPatterns}
              help="By default, when gzip is enabled, everything has gzip. But sometimes you need to exlude something, so just add regex to matching path you want to exlude."
              onChange={arr => this.changeTheValue('gzip.excludedPatterns', arr)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Client settings">
            <BooleanInput
              label="Use circuit breaker"
              help="Use a circuit breaker to avoid cascading failure when calling chains of services. Highly recommended !"
              value={this.state.service.clientConfig.useCircuitBreaker}
              onChange={v => this.changeTheValue('clientConfig.useCircuitBreaker', v)}
            />
            <NumberInput
              suffix="times"
              label="Client attempts"
              help="Specify how many times the client will retry to fetch the result of the request after an error before giving up."
              value={this.state.service.clientConfig.retries}
              onChange={v => this.changeTheValue('clientConfig.retries', v)}
            />
            <NumberInput
              suffix="ms."
              label="Client call timeout"
              help="Specify how long each call should last at most in milliseconds."
              value={this.state.service.clientConfig.callTimeout}
              onChange={v => this.changeTheValue('clientConfig.callTimeout', v)}
            />
            <NumberInput
              suffix="ms."
              label="Client global timeout"
              help="Specify how long the global call (with retries) should last at most in milliseconds."
              value={this.state.service.clientConfig.globalTimeout}
              onChange={v => this.changeTheValue('clientConfig.globalTimeout', v)}
            />
            <NumberInput
              suffix="times"
              label="C.breaker max errors"
              value={this.state.service.clientConfig.maxErrors}
              help="Specify how many errors can pass before opening the circuit breaker"
              onChange={v => this.changeTheValue('clientConfig.maxErrors', v)}
            />
            <NumberInput
              suffix="ms."
              label="C.breaker retry delay"
              value={this.state.service.clientConfig.retryInitialDelay}
              help="Specify the delay between two retries. Each retry, the delay is multiplied by the backoff factor"
              onChange={v => this.changeTheValue('clientConfig.retryInitialDelay', v)}
            />
            <NumberInput
              suffix="times"
              label="C.breaker backoff factor"
              help="Specify the factor to multiply the delay for each retry"
              value={this.state.service.clientConfig.backoffFactor}
              onChange={v => this.changeTheValue('clientConfig.backoffFactor', v)}
            />
            <NumberInput
              suffix="ms."
              label="C.breaker window"
              value={this.state.service.clientConfig.sampleInterval}
              help="Specify the sliding window time for the circuit breaker in milliseconds, after this time, error count will be reseted"
              onChange={v => this.changeTheValue('clientConfig.sampleInterval', v)}
            />
            <Separator title="Proxy settings" />
            <Proxy
              value={this.state.service.clientConfig.proxy}
              onChange={v => this.changeTheValue('clientConfig.proxy', v)}
            />
            {false && (
              <div className="form-group">
                <label className="col-xs-12 col-sm-2 control-label" />
                <div className="col-sm-10">
                  <button
                    type="button"
                    className="btn btn-danger btn-xs"
                    onClick={this.resetCircuitBreaker}
                    {...createTooltip('Reset current setting to use the new one')}>
                    Reset Circuit Breakers
                  </button>
                </div>
              </div>
            )}
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="HTTP Headers">
            <ObjectInput
              label="Additional Headers In"
              placeholderKey="Header name (ie.Access-Control-Allow-Origin)"
              placeholderValue="Header value (ie. *)"
              value={this.state.service.additionalHeaders}
              help="Specify headers that will be added to each client request (from Otoroshi to target). Useful to add authentication."
              onChange={v => this.changeTheValue('additionalHeaders', v)}
            />
            <ObjectInput
              label="Additional Headers Out"
              placeholderKey="Header name (ie. Content-Security-Policy)"
              placeholderValue="Header value (ie. default-src 'src')"
              value={this.state.service.additionalHeadersOut}
              help="Specify headers that will be added to each client responsse (from Otoroshi to client)."
              onChange={v => this.changeTheValue('additionalHeadersOut', v)}
            />
            <div className="form-group">
              <label
                htmlFor={`input-${this.props.label}`}
                className="col-xs-12 col-sm-2 control-label">
                Security headers
              </label>
              <div className="col-sm-10">
                <button
                  type="button"
                  style={{ marginBottom: 5 }}
                  onClick={e => this.addSecurityHeader('X-Frame-Option', 'DENY')}
                  disabled={this.computeIfButtonDisabled('X-Frame-Option')}
                  className="btn btn-xs btn-success">
                  X-Frame-Option
                </button>
                <button
                  type="button"
                  style={{ marginBottom: 5 }}
                  onClick={e => this.addSecurityHeader('X-XSS-Protection', '1; mode=block')}
                  disabled={this.computeIfButtonDisabled('X-XSS-Protection')}
                  className="btn btn-xs btn-success">
                  X-XSS-Protection
                </button>
                <button
                  type="button"
                  style={{ marginBottom: 5 }}
                  onClick={e => this.addSecurityHeader('X-Content-Type-Options', 'nosniff')}
                  disabled={this.computeIfButtonDisabled('X-Content-Type-Options')}
                  className="btn btn-xs btn-success">
                  X-Content-Type-Options
                </button>
                <button
                  type="button"
                  style={{ marginBottom: 5 }}
                  onClick={e =>
                    this.addSecurityHeader('X-Permitted-Cross-Domain-Policies', 'master-only')
                  }
                  disabled={this.computeIfButtonDisabled('X-Permitted-Cross-Domain-Policies')}
                  className="btn btn-xs btn-success">
                  X-Permitted-Cross-Domain-Policies
                </button>
                <button
                  type="button"
                  style={{ marginBottom: 5 }}
                  onClick={e =>
                    this.addSecurityHeader(
                      'Referrer-Policy',
                      'origin-when-cross-origin, strict-origin-when-cross-origin'
                    )
                  }
                  disabled={this.computeIfButtonDisabled('Referrer-Policy')}
                  className="btn btn-xs btn-success">
                  Referrer-Policy
                </button>
                <button
                  type="button"
                  style={{ marginBottom: 5 }}
                  onClick={e =>
                    this.addSecurityHeader('Content-Security-Policy', "default-src 'self'")
                  }
                  disabled={this.computeIfButtonDisabled('Content-Security-Policy')}
                  className="btn btn-xs btn-success">
                  Content-Security-Policy
                </button>
                <button
                  type="button"
                  style={{ marginBottom: 5 }}
                  onClick={e =>
                    this.addSecurityHeader(
                      'Strict-Transport-Security',
                      'max-age=86400; includeSubDomains; preload'
                    )
                  }
                  disabled={this.computeIfButtonDisabled('Strict-Transport-Security')}
                  className="btn btn-xs btn-success">
                  Strict-Transport-Security
                </button>
                <button
                  type="button"
                  style={{ marginBottom: 5 }}
                  onClick={e =>
                    this.addSecurityHeader(
                      'Public-Key-Pins',
                      'pin-sha256="....."; max-age=10; includeSubdomains'
                    )
                  }
                  disabled={this.computeIfButtonDisabled('Public-Key-Pins')}
                  className="btn btn-xs btn-success">
                  Public-Key-Pins
                </button>
              </div>
            </div>
            <ObjectInput
              label="Matching Headers"
              placeholderKey="Header name (ie. Accept)"
              placeholderValue="Header value (ie. application/vnd.myapp.v2+json)"
              value={this.state.service.matchingHeaders}
              help="Specify headers that MUST be present on client request to route it (pre routing). Useful to implement versioning."
              onChange={v => this.changeTheValue('matchingHeaders', v)}
            />
            <ObjectInput
              label="Headers verification"
              placeholderKey="Header name"
              placeholderValue="Header value"
              value={this.state.service.headersVerification}
              help="Verify that some headers has a specific value (post routing)"
              onChange={v => this.changeTheValue('headersVerification', v)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Additional settings">
            <TextInput
              label="OpenAPI"
              placeholder="The URL for the OpenAPI descriptor of this service"
              value={this.state.service.api.openApiDescriptorUrl}
              help="Specify an open API descriptor. Useful to display the documentation"
              onChange={e => this.changeTheValue('api.openApiDescriptorUrl', e)}
            />
            <ObjectInput
              label="Metadata"
              placeholderKey="Metadata key"
              placeholderValue="Metadata value"
              value={this.state.service.metadata}
              help="Specify metadata for the service. Useful for analytics"
              onChange={v => this.changeTheValue('metadata', v)}
            />
            <ArrayInput
              label="IP Whitelist"
              placeholder="IP address that can access the service"
              value={this.state.service.ipFiltering.whitelist}
              help="List of whitelisted IP addresses"
              onChange={arr => this.changeTheValue('ipFiltering.whitelist', arr)}
            />
            <ArrayInput
              label="IP Blacklist"
              placeholder="IP address that cannot access the service"
              value={this.state.service.ipFiltering.blacklist}
              help="List of blacklisted IP addresses"
              onChange={arr => this.changeTheValue('ipFiltering.blacklist', arr)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label={
              <span>
                Canary mode <i className="fab fa-twitter" />
              </span>
            }>
            <BooleanInput
              label="Enabled"
              value={this.state.service.canary.enabled}
              help="Canary mode enabled"
              onChange={v => this.changeTheValue('canary.enabled', v)}
            />
            <NumberInput
              suffix="ratio"
              label="Traffic split"
              help="Ratio of traffic that will be sent to canary targets. For instance, if traffic is at 0.2, for 10 request, 2 request will go on canary targets and 8 will go on regular targets."
              value={this.state.service.canary.traffic}
              onChange={v => this.changeTheValue('canary.traffic', v)}
            />
            <ArrayInput
              label="Targets"
              placeholder="Target URL"
              value={this.state.service.canary.targets.map(this.transformTarget)}
              help="The list of target that Otoroshi will proxy and expose through the subdomain defined before. Otoroshi will do round-robin load balancing between all those targets with circuit breaker mecanism to avoid cascading failures"
              onChange={this.changeCanaryTargetsValue}
            />
            <TextInput
              label="Targets root"
              placeholder="The root URL of the target service"
              value={this.state.service.canary.root}
              help="Otoroshi will append this root to any target choosen. If the specified root is '/api/foo', then a request to https://yyyyyyy/bar will actually hit https://xxxxxxxxx/api/foo/bar"
              onChange={e => this.changeTheValue('canary.root', e)}
            />
            <CanaryCampaign serviceId={this.state.service.id} />
            <div className="form-group">
              <label
                htmlFor={`input-${this.props.label}`}
                className="col-xs-12 col-sm-2 control-label"
              />
              <div className="col-sm-10" style={{ paddingTop: 5 }}>
                <button
                  type="button"
                  className="btn btn-success btn-xs"
                  onClick={this.canaryToStandard}>
                  <i className="fab fa-twitter" /> Use canary targets as standard targets
                </button>
              </div>
            </div>
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="HealthCheck settings">
            <BooleanInput
              label="HealthCheck enabled"
              value={this.state.service.healthCheck.enabled}
              help="To help failing fast, you can activate healthcheck on a specific URL."
              onChange={v => this.changeTheValue('healthCheck.enabled', v)}
            />
            <TextInput
              label="HealthCheck url"
              value={this.state.service.healthCheck.url}
              help="The URL to check. Should return an HTTP 200 response. You can also respond with an 'Opun-Health-Check-Logic-Test-Result' header set to the value of the 'Opun-Health-Check-Logic-Test' request header + 42. to make the healthcheck complete."
              onChange={v => this.changeTheValue('healthCheck.url', v)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Faults injection">
            <BooleanInput
              label="User facing app."
              value={this.state.service.userFacing}
              help="If service is set as user facing, Snow Monkey can be configured to not being allowed to create outage on them."
              onChange={v => this.changeTheValue('userFacing', v)}
            />
            <BooleanInput
              label="Chaos enabled"
              value={this.state.service.chaosConfig.enabled}
              help="Activate or deactivate chaos setting on this service descriptor."
              onChange={v => this.changeTheValue('chaosConfig.enabled', v)}
            />
            <ChaosConfigWithSkin
              inServiceDescriptor
              initCollapsed={false}
              collapsed={this.state.allCollapsed}
              config={this.state.service.chaosConfig}
              onChange={v => this.changeTheValue('chaosConfig', v)}
            />
          </Collapse>
          <Collapse
            notVisible={this.state.service.redirection.enabled}
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Custom errors template">
            {!this.state.neverSaved && <TemplateInput service={this.state.service} />}
            {this.state.neverSaved && (
              <div className="form-group">
                <label className="col-xs-12 col-sm-2 control-label" />
                <div className="col-sm-10">
                  <p style={{ padding: 10, borderRadius: 5, backgroundColor: '#494948' }}>
                    Custom error templates are not available on a service descriptor that hasn't
                    been created yet. Just save the service descriptor and it will be available.
                  </p>
                </div>
              </div>
            )}
          </Collapse>
          <Collapse
            notVisible={
              this.props.env
                ? !this.props.env.scriptingEnabled || this.state.service.redirection.enabled
                : false
            }
            collapsed={this.state.allCollapsed}
            initCollapsed={true}
            label="Request transformation">
            <Warning />
            <SelectInput
              label="Request transformer"
              value={this.state.service.transformerRef}
              onChange={e => this.changeTheValue('transformerRef', e)}
              valuesFrom="/bo/api/proxy/api/scripts/_list"
              transformer={a => ({ value: a.id, label: a.name })}
              help="..."
            />
            <div className="form-group">
              <label className="col-xs-12 col-sm-2 control-label" />
              <div className="col-sm-10">
                {!this.state.service.transformerRef && (
                  <a href={`/bo/dashboard/scripts/add`} className="btn btn-sm btn-primary">
                    <i className="glyphicon glyphicon-plus" /> Create a new script.
                  </a>
                )}
                {this.state.service.transformerRef && (
                  <a
                    href={`/bo/dashboard/scripts/edit/${this.state.service.transformerRef}`}
                    className="btn btn-sm btn-success">
                    <i className="glyphicon glyphicon-edit" /> Edit the script.
                  </a>
                )}
                <a href={`/bo/dashboard/scripts`} className="btn btn-sm btn-primary">
                  <i className="glyphicon glyphicon-link" /> all scripts.
                </a>
              </div>
            </div>
          </Collapse>
        </form>
      </div>
    );
  }
}

export class TemplateInput extends Component {
  state = {
    template: null,
  };

  formSchema = {
    template40x: {
      type: 'code',
      props: {
        mode: 'html',
        label: '40x template',
        placeholder: '',
        help: 'This template will be displayed for any 40x http response',
      },
    },
    template50x: {
      type: 'code',
      props: {
        mode: 'html',
        label: '50x template',
        placeholder: '',
        help: 'This template will be displayed for any 50x http response',
      },
    },
    templateBuild: {
      type: 'code',
      props: {
        mode: 'html',
        label: 'Build mode template',
        placeholder: '',
        help: 'This template will be displayed when the service will be in build mode',
      },
    },
    templateMaintenance: {
      type: 'code',
      props: {
        mode: 'html',
        label: 'Maintenance mode template',
        placeholder: '',
        help: 'This template will be displayed when the service will be in maintenance mode',
      },
    },
    messages: {
      type: 'object',
      props: {
        mode: 'json',
        label: 'Custom messages',
        placeholderKey: 'Message ID',
        placeholderValue: 'Custom message',
        help:
          'This will be the translation map for all possible messages. Those values will be injected in the templates if you use variable replacements syntax (explained above)',
      },
    },
  };

  formFlow = ['template40x', 'template50x', 'templateBuild', 'templateMaintenance', 'messages'];

  message = 'You can use some variables in your templates that will be swapped with actual values : ${otoroshiMessage} will contain the raw otoroshi message for the error, ${status} will contain sthe current http status, ${errorId} will contain a unique number to track the error, ${message} will contain a translated value based on http status, ${cause} will contain a translated value based on a unique error id (ie. like errors.service.not.found). ${message} and ${cause} will be fetched from the `Custom messages` map and will have the value you specified.';

  componentDidMount() {
    BackOfficeServices.findTemplateById(this.props.service.id).then(template =>
      this.setState({ template })
    );
  }

  updateState = template => {
    this.setState({ template });
  };

  getValue = () => {
    return this.state.template;
  };

  template = (title, message, comeBack = false, error = false) => {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
      <title>${title}</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1,shrink-to-fit=no">
      <meta name="theme-color" content="#000000">
      <meta name="robots" content="noindex, nofollow">
      <link rel="shortcut icon" type="image/png" href="/__otoroshi_assets/images/favicon.png">
      <link rel="stylesheet" href="/__otoroshi_assets/stylesheets/bootstrap.min.css">
      <link rel="stylesheet" href="/__otoroshi_assets/stylesheets/bootstrap-theme.min.css">
      <link rel="stylesheet" media="screen" href="/__otoroshi_assets/stylesheets/otoroshiapps.css">
      <link href="/assets/fonts/raleway/raleway.css" rel="stylesheet">
      <link rel="stylesheet" media="screen" href="/__otoroshi_assets/stylesheets/error.css">
  </head>
  <body>
      <div class="container">
        <div class="header clearfix">
            <nav class="navbar-inverse"></nav>
            <a class="navbar-brand" href="/" style="display: flex;">
            <span>おとろし</span>&nbsp; Otoroshi
            </a>
        </div>
        <div class="jumbotron">
            ${
              error
                ? `<h2><i class="glyphicon glyphicon-warning-sign"></i> ${title}</h2>`
                : `<h2 style="color:white;">${title}</h2>`
            }
            <p class="lead">
              ${message}
            </p>
            ${comeBack ? '<p class="lead">try to come back later 😉</p>' : ''}
            <p><img class="logo" src="/__otoroshi_assets/images/otoroshi-logo-color.png" style="width: 300px;"></p>
        </div>
      </div>
  </body>
</html>`;
  };

  createTemplate = () => {
    BackOfficeServices.createTemplate({
      serviceId: this.props.service.id,
      templateBuild: this.template(
        'Custom service under construction',
        "The service you're trying to reach is under construction",
        true
      ),
      templateMaintenance: this.template(
        'Custom service in maintenance',
        "The service you're trying to reach is in maintenance",
        true
      ),
      template40x: this.template(
        'Otoroshi error',
        '${message} - ${cause} - error number: ${errorId}',
        false,
        true
      ),
      template50x: this.template(
        'Otoroshi error',
        '${message} - ${cause} - error number: ${errorId}',
        false,
        true
      ),
      messages: {
        'message-400': '400',
        'message-403': '403',
        'message-404': '404',
        'message-417': '417',
        'message-429': '429',
        'message-500': '500',
        'message-502': '502',
        'message-503': '503',
        'errors.cant.process.more.request': 'Proxy cannot process more request',
        'errors.service.in.maintenance': 'Service in maintenance mode',
        'errors.service.under.construction': 'Service under construction',
        'errors.client.error': 'Client error',
        'errors.server.error': 'Server error',
        'errors.entity.too.big': 'Entity is too big for processing',
        'errors.service.not.found': 'Service not found',
        'errors.request.timeout': 'Request timeout',
        'errors.circuit.breaker.open': 'Service is overwhelmed',
        'errors.connection.refused': 'Connection refused to service',
        'errors.proxy.error': 'Proxy error',
        'errors.no.service.found': 'No service found',
        'errors.service.not.secured': 'The service is not secured',
        'errors.service.down': 'The service is down',
        'errors.too.much.requests': 'Too much requests',
        'errors.invalid.api.key': 'Invalid ApiKey provided',
        'errors.bad.api.key': 'Bad ApiKey provided',
        'errors.no.api.key': 'No ApiKey provided',
        'errors.ip.address.not.allowed': 'IP address not allow',
        'errors.not.found': 'Page not found',
        'errors.bad.origin': 'Bad origin',
      },
    }).then(template => {
      this.setState({ template });
    });
  };

  deleteTemplate = () => {
    BackOfficeServices.deleteTemplate(this.state.template).then(__ =>
      this.setState({ template: null })
    );
  };

  saveTemplate = () => {
    BackOfficeServices.updateTemplate(this.state.template).then(template =>
      this.setState({ template })
    );
  };

  render() {
    if (!this.state.template) {
      return (
        <div className="form-group">
          <label className="col-xs-12 col-sm-2 control-label" />
          <div className="col-sm-10">
            <button type="button" className="btn btn-success" onClick={this.createTemplate}>
              Create custom error template
            </button>
          </div>
        </div>
      );
    }
    return (
      <div>
        <div className="form-group">
          <label className="col-xs-12 col-sm-2 control-label" />
          <div className="col-sm-8">
            <p style={{ padding: 10, borderRadius: 5, backgroundColor: '#494948' }}>
              {this.message}
            </p>
          </div>
          <div className="col-sm-2">
            <button
              type="button"
              className="btn btn-success pull-right"
              style={{ marginLeft: 5 }}
              title="Save template"
              onClick={this.saveTemplate}>
              <i className="far fa-save" />
            </button>
            <button
              type="button"
              className="btn btn-danger pull-right"
              title="Delete template"
              onClick={this.deleteTemplate}>
              <i className="glyphicon glyphicon-trash" />
            </button>
          </div>
        </div>
        <div className="form-group">
          <label className="col-xs-12 col-sm-2 control-label" />
          <div className="col-sm-10" />
        </div>
        <Form
          value={this.getValue()}
          onChange={this.updateState}
          flow={this.formFlow}
          schema={this.formSchema}
          style={{ marginTop: 0 }}
        />
      </div>
    );
  }
}

export class PublicUiButton extends Component {
  makePublic = e => {
    if (e && e.preventDefault()) e.preventDefault();
    const newValue = [...this.props.value, '/.*'];
    this.props.onChange(newValue);
  };

  render() {
    const isAlreadyPublic = this.props.value.filter(p => p === '/.*').length > 0;
    if (isAlreadyPublic) {
      return (
        <button type="button" disabled className="btn btn-success btn-xs">
          <i className="fas fa-unlock" /> Service is already a 'public ui' ...
        </button>
      );
    } else {
      return (
        <button type="button" className="btn btn-success btn-xs" onClick={this.makePublic}>
          <i className="fas fa-unlock" /> Make service a 'public ui'
        </button>
      );
    }
  }
}

export class PrivateApiButton extends Component {
  makePublic = e => {
    if (e && e.preventDefault()) e.preventDefault();
    const newValue = [...this.props.value, '/api/.*'];
    this.props.onChange(newValue);
  };

  render() {
    const isAlreadyPrivateApi = this.props.value.filter(p => p === '/api/.*').length > 0;
    if (isAlreadyPrivateApi) {
      return (
        <button type="button" disabled className="btn btn-danger btn-xs" style={{ marginLeft: 5 }}>
          <i className="fas fa-lock" /> Service is already a 'private api' ...
        </button>
      );
    } else {
      return (
        <button
          type="button"
          className="btn btn-danger btn-xs"
          style={{ marginLeft: 5 }}
          onClick={this.makePublic}>
          <i className="fas fa-lock" /> Make service a 'private api'
        </button>
      );
    }
  }
}
