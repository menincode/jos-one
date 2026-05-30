# Pyarmor Examples

This file provides concise, practical examples for common Pyarmor workflows.
Content is normalized to standard Markdown and trimmed to avoid duplicated or
tool-specific noise.

## 1) Install and baseline obfuscation

```bash
pip install pyarmor
pyarmor gen app.py
python dist/app.py
```

Use this first to verify your app still runs after obfuscation.

## 2) Obfuscate an entrypoint in a source tree

```bash
pyarmor gen src/main.py
python dist/src/main.py
```

Always validate from `dist/` artifacts, not only from source.

## 3) Recursive obfuscation for package-style projects

```bash
pyarmor gen -r src/
python dist/src/main.py
```

Use recursive mode when your entrypoint depends on local packages/modules.

## 4) Expiration-based trial build

```bash
pyarmor gen -e 30 app.py
python dist/app.py
```

Example meaning: obfuscated artifact is valid for 30 days.

## 5) Machine binding example

```bash
pyarmor gen -b "66:77:88:9a:cc:fa" app.py
python dist/app.py
```

For multiple machines, repeat `-b` as needed.

## 6) Outer runtime key flow

```bash
# Generate artifact requiring external runtime key
pyarmor gen --outer app.py

# Generate runtime key (example: 3 days)
pyarmor gen key -e 3

# Copy key to runtime package
cp dist/pyarmor.rkey dist/pyarmor_runtime_000000/
```

Use outer keys when you need post-build key rotation.

## 7) Packing with PyInstaller (one-file)

```bash
pip install pyinstaller
pyarmor gen --pack onefile app.py
```

Run the bundled output from `dist/` and re-check critical flows.

## 8) Packing with PyInstaller (one-dir)

```bash
pip install pyinstaller
pyarmor gen --pack onedir app.py
```

Use one-dir mode when runtime files need to remain unpacked.

## 9) Packing with existing spec file

```bash
pyarmor gen --pack app.spec -r app.py src/
```

Ensure all related scripts/packages are listed so they are obfuscated too.

## 10) CI pipeline smoke flow

```bash
pip install pyarmor
pyarmor gen app.py
python dist/app.py --help
```

Keep CI checks focused on startup and critical-path smoke tests.

## 11) Third-party/dependency compatibility check

- Obfuscate project in a clean environment.
- Validate imports/plugins that rely on dynamic loading.
- Run integration smoke tests against obfuscated artifacts.

## 12) Pre-release checklist

- [ ] Source build tests pass.
- [ ] Obfuscated artifact tests pass.
- [ ] Packaged artifact starts on target OS.
- [ ] License strategy is documented (none/expiry/binding).
- [ ] Rollback artifact is prepared.

## Notes

- Obfuscation is defense-in-depth, not a replacement for authentication or secure
  secret management.
- Keep high-value secrets out of client code even when obfuscated.
- Prefer reproducible build scripts and pinned tool versions for release stability.

## References

- [Pyarmor how-to docs](https://github.com/dashingsoft/pyarmor/tree/master/docs/how-to)
- [Pyarmor GitHub](https://github.com/dashingsoft/pyarmor)
- [Pyarmor official site](http://pyarmor.dashingsoft.com/)
.. highlight:: console

==============================
 Using Pyarmor in CI Pipeline
==============================

There are 2 ways to use Pyarmor in CI/CD pipeline:

- Direct way, it's simple, but only works for Trial, Basic and CI license, and there is rate limits
- Indirect way, it need change the original build workflow, but works for any type license

Direct Way
==========

**Trial Version** could be used in CI/CD pipeline by one step::

    pip install pyarmor

For :term:`Pyarmor Basic` and :term:`Pyarmor CI` License

- Refer to :ref:`initial registration`, first got :term:`registration file` like ``pyarmor-regfile-xxxx.zip``
- In local device run the following command to request one CI regfile ``pyarmor-ci-xxxx.zip``::

      $ pyarmor reg -C pyarmor-regfile-xxxx.zip

  Check CI license info in local machine::

      $ pyarmor --home temp reg pyarmor-ci-xxxx.zip

- In CI/CD pipeline, add 2 steps to register Pyarmor by CI regfile::

      # Please replace "9.X.Y" with current Pyarmor version
      pip install pyarmor=9.X.Y
      pyarmor reg pyarmor-ci-xxxx.zip

  Check registration information in CI/CD pipeline::

      pyarmor -v

Notes

* Do not request CI regfile in CI/CD pipeline
* CI regfile ``pyarmor-ci-xxxx.zip`` will be expired about in 360 days
* CI regfile may not work in future Pyarmor version
* Once CI regfile doesn't work, require new one
* One license can request <= 100 CI regfiles

.. note::

   In GitHub Action, it need one extra step, otherwise `CI license only works in CI/CD pipeline`

   1. For Ubuntu, add this step::

        - run: sudo mv /dev/disk /dev/disk-none

   2. For Darwin, add this step::

        - run: sudo mv /dev/rdisk0 /dev/rdisk0-none

   Refer to this thread `Error when using CI license in CI pipeline <https://github.com/dashingsoft/pyarmor/discussions/2004>`_

.. important::

   In CI/CD pipeline, each run `pyarmor gen` will send license and docker information to Pyarmor License Server, excessive requests or requests beyond normal usage may be rejected by Pyarmor License Server. Generally do not exceed any of these rate limits:

   - 1 run per second
   - 100 runs per hour
   - 1,000 runs per day
   - 10,000 runs per month

   If exceeds any of these limitions, please check the section `High frequency use solution`

.. important::

   It's not allowed to install and register Pyarmor in your customer's docker image, Pyarmor CI license is only be used in the build device.

When need to request new CI regfile
-----------------------------------

In the following cases, it need request one new CI regfile

- After :term:`Pyarmor CI` License is expired, all the previous CI regfiles don't work any longer. After the renewal is successful, it need request new CI regfile ``pyarmor-ci-N.zip``
- After Pyarmor is upgrade one new major/minor version, the old CI regfile may not work in the latest version (but it still works with old Pyarmor version). It need request one new CI regfile by new version. Note that the patch number has no effect for this case, for example, from v9.1.3 to v9.1.8, nothing changed.

High frequency use solution
---------------------------

.. versionadded:: 9.2.0

If many `pyarmor gen` commands are used in one workflow, try to merge them to one

For example::

    # Old workflow: there are 3 "pyarmor gen"
    pyarmor gen -R /path/to/package1
    pyarmor gen -R /path/to/package2
    pyarmor gen -R /path/to/package3

    # New workflow: merge 3 to one
    pyarmor gen -R /path/to/package1 /path/to/package2 /path/to/package2

Or create one Python script to execute all pyarmor commands in one process

For example, create one script `batch.py`:

.. code-block:: python

    import os
    import shlex

    from pyarmor.cli.__main__ import main_entry as pyarmor_run

    # Do not run `pyarmor reg pyarmor-ci-XXXX.zip` in the script

    # Run command: pyarmor gen -R /path/to/package1
    pyarmor_run(['gen', '-R', '/path/to/package1'])

    # Or more like shell command to run: pyarmor gen -R /path/to/package2
    cmdlist = shlex.split("pyarmor gen -R /path/to/package2")
    pyarmor_run(cmdlist[1:])

    # Or change path
    os.chdir('/path/to/other')

    # Execute any other pyarmor command
    cmdlist = shlex.split("pyarmor gen key -e 30")
    pyarmor_run(cmdlist[1:])

Then execute it in the workflow::

    $ pyarmor reg pyarmor-ci-8000.zip
    $ python3 batch.py

If merge solution doesn't work, or you don't want change the original workflow, it need request more quota.

Request More Quota
~~~~~~~~~~~~~~~~~~

The free quota is 10, 000 runs per month, exceed free quota, it need extra fees:

- 100,000 per month, extra fees: $10 for one year
- 200,000 per month, extra fees: $20 for one year
- 300,000 per month, extra fees: $30 for one year
- ...

The steps to request more quota

1. Send request to Pyarmor Team (pyarmor@163.com)

   Please provide the project information, web link, etc. Pyarmor team only use these information for internal review.

   And the quota per month. For example, 100, 000 per month.

2. Pyarmor Team send you PayPal invoice of extra fees.

   For example, if you request quota is 100, 000 per month, Pyarmor team will send you $10 invoice. One year later, when this CI license is expired and need renew, Pyarmor Team will send you $90 + $10 = $100 invoice

3. After invoice is paid, Pyarmor Team will send you notification email

4. You need request one new CI regfile with Pyarmor 9.2+

   Only Pyarmor 9.2+ support this feature.

Indirect Way
============

:term:`Pyarmor Pro` and :term:`Pyarmor Group` License can't be used in CI/CD pipeline directly, but this works

- First obfuscate the scripts in local device and store them to another branch like `master-obf`
- Then in CI/CD pipeline to check this new branch

Here is an example, suppose test-project locates at `https://github.com/dashingsoft/test-project`, the directory tree as follows::

    $ tree test-project

    test-project
    └── src
        ├── main.py
        ├── utils.py
        └── parent
            ├── child
            │   └── __init__.py
            └── __init__.py

In local device the scripts are obfuscated and are stored into another branch:

.. code-block:: bash

    $ git clone https://github.com/dashingsoft/test-project

    $ pip install pyarmor
    $ pyarmor reg /path/to/pyarmor-regfile-5068.zip

    # Create new branch
    $ git checkout -B master-obf

    # Create output path "dist" link to project path
    $ ln -s test-project dist

    # Obfuscate the script to "dist", which is same as "test-project"
    # So "dist/src/main.py" is same as "test-project/src/main.py"
    $ pyarmor gen -O dist -r --platform windows.x86_64,linux.x86_64,darwin.x86_64 test_project/src

    # Add runtime package to this branch
    $ git add -f test_project/pyarmor_runtime_5068/*

    # Commit the results
    $ git commit -m'Build obfuscated scripts' .

    # Push new branch to remote server
    $ git push -u origin master-obf

In CI/CD pipeline, it need not install Pyarmor, just checkout branch `master-obf`, and work as before.

.. include:: ../_common_definitions.txt


.. highlight:: console
.. program:: pyarmor gen

============================
 Protecting system packages
============================

.. versionadded:: 8.2
.. versionchanged:: 8.2.2
                    Do not use :option:`--restrict` with :option:`--pack`, it doesn't work.

When packing the scripts, Pyarmor could also protect system packages in the bundle. The idea is to list all the dependent modules and packages and obfuscate them too.

Here it's an example to protect system packages for script ``foo.py``.

We need generate a file ``file.list`` list all the dependent modules and packages of ``foo.py`` by using PyInstaller features.

First generate ``foo.spec``::

    $ pyi-makespec foo.py

Then patch ``foo.spec``:

.. code-block:: python

    a = Analysis(
        ...
    )

    # Patched by Pyarmor to generate file.list
    _filelist = []
    _package = None
    for _src in sort([_src for _name, _src, _type in a.pure]):
        if _src.endswith('__init__.py'):
            _package = _src.replace('__init__.py', '')
            _filelist.append(_package)
        elif _package is None:
            _filelist.append(_src)
        elif not _src.startswith(_package):
            _package = None
            _filelist.append(_src)
    with open('file.list', 'w') as _file:
        _file.write('\n'.join(_filelist))
    # End of patch

Next pack ``foo.py`` by PyInstaller and generate :file:`file.list` at the same time::

    $ pyinstaller foo.py

Finally repack the script with the following options::

    $ pyarmor gen --assert-call --assert-import --pack dist/foo/foo foo.py @file.list

This example only guides how to do, please write your own patch script and use other necessary options to obfuscate scripts. For example, you could manually edit :file:`file.list` to meet needs.

====================
 Fix encoding error
====================

The default encoding is ``utf-8``, if encoding error occurs when obfuscating the scripts, set encoding to right one. For example, change default encoding to ``gbk``::

    $ pyarmor cfg encoding=gbk

When customizing runtime error message, it also could specify encoding for ``messages.cfg``. For example, set encoding to ``gbk`` by this command::

    $ pyarmor cfg messages=messages.cfg:gbk

====================
 Removing docstring
====================

It's easy to remove docstring from obfuscated scripts::

    $ pyarmor cfg optimize 2

The argument optimize specifies the optimization level of the compiler; the default value of -1 selects the optimization level of the interpreter as given by -O options. Explicit levels are 0 (no optimization; __debug__ is true), 1 (asserts are removed, __debug__ is false) or 2 (docstrings are removed too).

.. include:: ../_common_definitions.txt

========================
 Packing with outer key
========================

.. highlight:: console

This example shows how to pack ``src/myapp.py`` with :term:`outer key`

First pack it by PyInstaller::

    $ pyinstaller myapp.py

Next obfuscate the script with outer key::

    $ pyarmor gen --outer --pack dist/myapp/myapp myapp.py

Then generate an outer key::

    $ pyarmor gen key -O keylist -e 30

For one-folder mode, generally save outer key in the runtime package. For example::

    $ cp keylist/pyarmor.rkey dist/myapp/pyarmor_runtime_000000/

Thus it could run ``dist/myapp/myapp`` in any path. For example::

    $ dist/myapp/myapp

For one-file mode, generally store outer key to the same path of executable, and rename it to ``EXECUTABLE.KEYNAME``. For example::

    $ pyinstaller --onefile myapp.py
    $ pyarmor gen --outer --pack dist/myapp myapp.py
    $ pyarmor gen key -O keylist -e 30
    $ cp keylist/pyarmor.rkey dist/myapp.pyarmor.rkey

Thus it could run ``dist/myapp`` in any path. For example::

    $ dist/myapp

The outer key also could be stored in a fixed path specified by :envvar:`PYARMOR_RKEY`. For example::

    $ export PYARMOR_RKEY=/opt/pyarmor/runtime_data
    $ mkdir -p /opt/pyarmor/runtime_data
    $ cp keylist/pyarmor.rkey /opt/pyarmor/runtime_data/
    $ dist/foo

.. include:: ../_common_definitions.txt

================================
 Protecting Runtime Memory Data
================================

.. contents:: Contents
   :depth: 2
   :local:
   :backlinks: top

.. highlight:: console

.. program:: pyarmor gen

Pyarmor focuses on protecting Python scripts, through several irreversible obfuscation methods, Pyarmor makes sure the obfuscated scripts can't be restored by any way.

But it isn't good at memory protection and anti-debug. If you care about runtime memory data, or runtime key verification, generally it need extra methods to prevent debugger from hacking dynamic libraries.

Pyarmor could prevent hacker from querying runtime data by valid Python C API and other Python ways, only if the Python interpreter and extension module ``pyarmor_runtime`` are not hacked. This is what extra tools need to protect, the common methods include

- Signing the binary file to make sure they're not changed by others
- Using third-party binary protection tools to protect Python interpreter and extension module ``pyarmor_runtime``
- Pyarmor provides some configuration options to check interps and debuggers.
- Pyarmor provides runtime patch feature to let expert users to write C functions or python scripts to improve security.

..
  In Windows, using :option:`--enable-themida` could prevent from this attack, it could protect extension module ``pyarmor_runtime.pyd`` very well. But in the other platforms, it need extra tools to protect binary extension ``pyarmor_runtime.so``.

**Basic steps**

Above all, Python interpreter to run the obfuscated scripts can't be replaced, if the obfuscated scripts could be executed by patched Python interpreter, it's impossible to prevent others to read any Python runtime data.

At this time Pyarmor need :option:`--pack` to implement this, and need move real code from main script to one module, because :option:`--private` doesn't work for main script.

First configure necessary items [#]_::

    $ pyarmor cfg check_debugger=1 check_interp=1

Next pack the script by the following options [#]_::

    $ pyarmor gen --mix-str --assert-call --assert-import --private --pack onedir foo.py real_foo.py

Then protect all the binary files in the output path :file:`dist/foo/` through external tools, make sure these binary files can not be replaced or modified in runtime.

Available external tools: codesign, VMProtect

.. rubric:: Note

.. [#] Do not use ``check_interp`` in 32-bit x86 platforms, it doesn't work

.. [#] If pack to one file by PyInstaller, it's not enough to protect this file alone. You must make sure all the binary files extracted from this file are protected too.

**Hook Scripts**

Expert users could write :term:`hook script` to check PyInstaller bootstrap modules to improve security.

Here it's an example to show how to do, note that it may not work in different PyInstaller version, do not use it directly.

.. code-block:: python
    :linenos:
    :emphasize-lines: 12-14

    # Hook script ".pyarmor/hooks/foo.py"

    def protect_self():
        from sys import modules

        def check_module(name, checklist):
            m = modules[name]
            for attr, value in checklist.items():
                if value != sum(getattr(m, attr).__code__.co_code):
                    raise RuntimeError('unexpected %s' % m)

        checklist__frozen_importlib = {}
        checklist__frozen_importlib_external = {}
        checklist_pyimod03_importers = {}

        check_module('_frozen_importlib', checklist__frozen_importlib)
        check_module('_frozen_importlib_external', checklist__frozen_importlib_external)
        check_module('pyimod03_importers', checklist_pyimod03_importers)

    protect_self()

The highlight lines need to be replaced with real check list. In order to get baseline, first replace function ``check_module`` with this fake function

.. code-block:: python

        def check_module(name, checklist):
            m = modules[name]
            refs = {}
            for attr in dir(m):
                value = getattr(m, attr)
                if hasattr(value, '__code__'):
                    refs[attr] = sum(value.__code__.co_code)
            print('    checklist_%s = %s' % (name, refs))


Run the following command to get baseline::

    $ pyinstaller foo.py
    $ pyarmor gen --pack dist/foo/foo foo.py

    ...
    checklist__frozen_importlib = {'__import__': 9800, ...}
    checklist__frozen_importlib_external = {'_calc_mode': 2511, ...}
    checklist_pyimod03_importers = {'imp_lock': 183, 'imp_unlock': 183, ...}

Edit hook script to restore ``check_module`` and replace empty check lists with real ones.

Using this real hook script to generate the final bundle::

    $ pyinstaller foo.py
    $ pyarmor gen --pack dist/foo/foo foo.py

**Runtime Patch**

.. versionadded:: 8.3

Pyarmor provides runtime patch feature so that users could write one C or python script to do any anti-debug or other checks. It will be embedded into :term:`runtime files`, and called on extension module ``pyarmor_runtime`` initialization.

First create script :file:`.pyarmor/hooks/pyarmor_runtime.py`, and do some checks in the function :func:`bootstrap`. For example:

.. code-block:: python

   def bootstrap(user_data):
       from ctypes import windll
       if windll.kernel32.IsDebuggerPresent():
           print('found debugger')
           return False


.. include:: ../_common_definitions.txt



=======================
 Using Pyarmor License
=======================

.. contents:: Contents
   :depth: 2
   :local:
   :backlinks: top

.. highlight:: console

.. program:: pyarmor reg

Prerequisite
============

First of all

1. One :term:`activation file` of :term:`Pyarmor License`, refer to :doc:`../licenses` to purchase right one
2. One device has installed Pyarmor 9.0+
3. Internet connection
4. Product name which bind to this license

.. _initial registration:

Initial registration
====================

Any license need this step to request :term:`registration file` from Pyarmor License Server by :term:`activation file` like :file:`pyarmor-regcode-xxxx.txt`::

    $ pyarmor reg -p "XXX" pyarmor-regcode-xxxx.txt

Using :option:`-p` to specify product name for this license, please replace "XXX" with real product name. For non-commercial use, replace it to ``non-profits``.

If initial registration is successful, one :term:`registration file` like :file:`pyarmor-regfile-xxxx.zip` is generated in the current path at the same time. This file is used for subsequent registration in other machines.

Once initial registration completed, activation file :file:`pyarmor-regcode-xxxx.txt` is invalid, do not use it again.

Once initial registration completed, product name can't be changed.

Please backup registration file :file:`pyarmor-regfile-xxxx.zip` carefully. If lost, Pyarmor is not responsible for keeping this license and no lost-found service.

Product name is not decided
---------------------------

When a product is in development, and the product name is not decided. Set product name to ``TBD`` on initial registration. For example::

    $ pyarmor reg -p "TBD" pyarmor-regcode-xxxx.txt

In 6 months real product name must be set by this command::

    $ pyarmor reg -p "XXX" pyarmor-regcode-xxxx.txt

If it's not changed after 6 months, the product name will be set to ``non-profits`` automatically and can't be changed again.

Using Pyarmor Basic or Pro
==========================

1. Refer to :ref:`initial registration`, got :term:`registration file` like `pyarmor-regfile-xxxx.zip`
2. Using :term:`registration file` to register Pyarmor in other devices

Copy :term:`registration file` to other machines, then run this command::

    $ pyarmor reg pyarmor-regfile-xxxx.zip

Check the registration information::

    $ pyarmor -v

After successful registration, all obfuscations will automatically apply this license, and each obfuscation requires online license verification.

This license can register Pyarmor on at most 100 devices

On each device it's enough to register Pyarmor once, do not register Pyarmor before each obfuscation

Do not register Pyarmor in the CI/CD pipeline or docker container by this :term:`registration file`, each run will taken as one new device.

.. seealso:: :doc:`ci`

.. _using ci license:

Using CI License
================

.. versionadded:: 9.0

Refer to :ref:`initial registration`, got :term:`registration file` like `pyarmor-regfile-xxxx.zip`

Do not use ``pyarmor-regfile-xxxx.zip`` in CI/CD pipeline directly, it's only used to request CI regfile:

- In local device run the following command to request one CI regfile ``pyarmor-ci-xxxx.zip``::

      $ pyarmor reg -C pyarmor-regfile-xxxx.zip

  Check CI license info in local machine::

      $ pyarmor --home temp reg pyarmor-ci-xxxx.zip

- In CI/CD pipeline, add 2 steps to register Pyarmor by CI regfile::

      # Please replace "9.X.Y" with current Pyarmor version
      pip install pyarmor=9.X.Y
      pyarmor reg pyarmor-ci-xxxx.zip

  Check registration information in CI/CD pipeline::

      pyarmor -v

Notes

* Do not request CI regfile in CI/CD pipeline
* CI regfile ``pyarmor-ci-xxxx.zip`` will be expired about in 360 days
* CI regfile may not work in future Pyarmor version
* Once CI regfile doesn't work, require new one
* One license can request <= 100 CI regfiles

.. important::

   :term:`Pyarmor CI` License doesn't work in local device

    Even in the CI/CD pipeline, :term:`Pyarmor CI` License also doesn't work in the runner which has its own disk. If the runner is not docker container, use :term:`Pyarmor Pro` License instead.

.. seealso:: :doc:`ci`

.. _check device for group license:

Check Device For Group License
==============================

Check one device works for group license by this way:

* First install Pyarmor 8.4.0+ trial version in this device
* Got machine id by the following command::

    $ pyarmor reg -g 1
    ...
    INFO     current machine id is "mc92c9f22c732b482fb485aad31d789f1"
    INFO     device file has been generated successfully

* Reboot this device, check machine id is same or not
* If machine id is same after each reboot, group license works in this device. Otherwise group license doesn't work in this device.

For docker container, please check docker host as above. Only if docker host could work with group license, unlimited docker containers could be run in this docker host, refer to :doc:`how-to/register` section ``run unlimited dockers in offline device``

**If machine id of docker host is changed after reboot, group license doesn't work in any docker container**

Most of physics machine, cloud server or VM like qemu, virtual box, vmware with same disk image work with Group license. Most of runners in CI/CD pipeline could not use Group License.

.. _using group license:

Using group license
===================

.. versionadded:: 8.2

Each :term:`Pyarmor Group` could have 100 offline devices, each device has its own number, from 1 to 100.

Only the machine id of device is not changed after reboot, it could be used as group device. Most of physics machine, cloud server or VM like Qemu, Virtual box, Vmware with same disk image work with Group license. Refer to :ref:`Check Device For Group License`

The allocated device No. is never free, if a device is reinstalled, it need allocate new one.

Basic steps:

1. Using activation file :file:`pyarmor-regcode-xxxx.txt` to initial registration, set product name bind to this license, and generate :term:`registration file`
2. Generating group device file separately on each offline device
3. Using :term:`registration file` and group device file to generate device registration file.
4. Using device registration file to register Pyarmor on offline device [#]_

.. [#] The device registration file is bind to specified device, each device has its own device regfile

Initial registration
--------------------

After purchasing :term:`Pyarmor Group`, an activation file :file:`pyarmor-regcode-xxxx.txt` is sent to registration email.

Initial registration need internet connection and Pyarmor 8.2+. Suppose product name is ``XXX``, then run this command::

    $ pyarmor reg -p XXX pyarmor-regcode-xxxx.txt

After initial registration completed, a :term:`registration file` ``pyarmor-regfile-xxxx.zip`` will be generated.

Group device file
-----------------

On each offline device, install Pyarmor 8.2+, and generate group device file. For example, on device no. 1, run this command::

    $ pyarmor reg -g 1

    INFO     Python 3.12.0
    INFO     Pyarmor 8.4.7 (trial), 000000, non-profits
    INFO     Platform darwin.x86_64
    INFO     generating device file ".pyarmor/group/pyarmor-group-device.1"
    INFO     current machine id is "mc92c9f22c732b482fb485aad31d789f1"
    INFO     device file has been generated successfully

It will generate group device file ``pyarmor-group-device.1``.

In order to make sure group license works for this device, reboot this device, and run this command again::

    $ pyarmor reg -g 1

    ...
    INFO     current machine id is "mc92c9f22c732b482fb485aad31d789f1"
    ...

Make sure this machine id is same after reboot.

Because group license is bind to device, so machine id should keep same after reboot. If it's changed after reboot, group license doesn't work in this device.

For VM machine, WSL(Windows Subsystem Linux) or any other system, please check the documentation to configure the network and harddisk, make sure network mac address and serial number of harddisk are fixed. If they're volatile, group license could not work in this system.

Generating offline device regfile
---------------------------------

Generating offline device regfile needs an internet connection, Pyarmor 8.2+, group device file  ``pyarmor-group-device.1`` and group license :term:`registration file` ``pyarmor-regfile-xxxx.zip``.

Copying group device file ``pyarmor-group-device.1`` to initial registration device or any computer which has internet connection and registration file, this file must be saved in the path ``.pyarmor/group/``, then run the following command to generate device regfile ``pyarmor-device-regfile-xxxx.1.zip``::

    $ mkdir -p .pyarmor/group
    $ cp pyarmor-group-device.1 .pyarmor/group/

    $ pyarmor reg -g 1 /path/to/pyarmor-regfile-xxxx.zip

The device regfile ``pyarmor-device-regfile-xxxx.1.zip`` is bind to machine id in the device file ``pyarmor-group-device.1``.

.. note::

   If there are new versions which fix any bug that machine id is changed after this device reboot, it need generate new device file ``pyarmor-group-device.2`` for this device by new Pyarmor version, and generate new device regfile ``pyarmor-device-regfile-xxxx.2.zip`` by new Pyarmor version too.

   Because device no. ``1`` has been used, so it need use next device no. ``2``, that is to say, one device may occupy more than one device no. Generally it should not be problem because there are 100 device no. available.

Registering Pyarmor in offline device
-------------------------------------

Once device regfile is generated, copy it to the corresponding device, run this command to register Pyarmor::

    $ pyarmor reg /path/to/pyarmor-device-regfile-xxxx.1.zip

    INFO     Python 3.12.0
    INFO     Pyarmor 8.4.7 (trial), 000000, non-profits
    INFO     Platform darwin.x86_64
    INFO     register "/path/to/pyarmor-device-regfile-xxxx.1.zip"
    INFO     machine id in group license: mc92c9f22c732b482fb485aad31d789f1
    INFO     got machine id: mc92c9f22c732b482fb485aad31d789f1
    INFO     this machine id matchs group license
    INFO     This license registration information:

    License Type    : pyarmor-group
    License No.     : pyarmor-vax-006000
    License To      : Tester
    License Product : btarmor

    BCC Mode        : Yes
    RFT Mode        : Yes

    Notes
    * Offline obfuscation

Note that this log says this device regfile is only for this machine id::

    INFO     machine id in group license: mc92c9f22c732b482fb485aad31d789f1

And this log show machine id of this device::

    INFO     got machine id: mc92c9f22c732b482fb485aad31d789f1

They must be matched, otherwise this device regfile doesn't work, it may need generate new device regfile for this device.

Check registration information::

    $ pyarmor -v

After successful registration, all obfuscations will automatically apply this group license, and each obfuscation need not online license verification.

Run unlimited dockers in offline device
---------------------------------------

.. versionadded:: 8.3

Group license supports unlimited dockers which uses default bridge network and not highly customized, the docker containers use same device regfile of host.

**how it works**

1. Each docker host is taken as an offlice device and must be registered as above.

2. Then start an auth-server in docker host to listen auth-request from docker container.

3. When run Pyarmor in docker container, it will send auth-request to auth-server in docker host, and verify the result returned from docker host.

**Linux Docker Host**

The practice for group license with unlimited docker containers:

- Docker host, Ubuntu x86_64, Python 3.8
- Docker container, Ubuntu x86_64, Python 3.11

The prerequisite in docker host:

- offline device regfile ``pyarmor-device-regfile-xxxx.1.zip`` as above
- Pyarmor 8.4.1+

First copy the following files to docker host:

- pyarmor-8.4.2.tar.gz
- pyarmor.cli.core-5.4.1-cp38-none-manylinux1_x86_64.whl
- pyarmor.cli.core-5.4.1-cp311-none-manylinux1_x86_64.whl
- pyarmor-device-regfile-6000.1.zip

Then run the following commands in the docker host::

    $ python3 --version
    Python 3.8.10

    $ pip install pyarmor.cli.core-5.4.1-cp38-none-manylinux1_x86_64.whl
    $ pip install pyarmor-8.4.1.tar.bgz

Next start ``pyarmor-auth`` to listen the request from docker containers::

    $ pyarmor-auth pyarmor-device-regfile-6000.1.zip

    2023-06-24 09:43:14,939: work path: /root/.pyarmor/docker
    2023-06-24 09:43:14,940: register "pyarmor-device-regfile-6000.1.zip"
    2023-06-24 09:43:15,016: listen container auth request on 0.0.0.0:29092

Do not close this console, open another console to run dockers.

For Linux container run it with extra ``--add-host=host.docker.internal:host-gateway``::

    $ docker run -it --add-host=host.docker.internal:host-gateway python bash

    root@86b180b28a50:/# python --version
    Python 3.11.4
    root@86b180b28a50:/#

In docker host open third console to copy files to container::

    $ docker cp pyarmor-8.4.1.tar.gz 86b180b28a50:/
    $ docker cp pyarmor.cli.core-5.4.1-cp311-none-manylinux1_x86_64.whl 86b180b28a50:/
    $ docker cp pyarmor-device-regfile-6000.1.zip 86b180b28a50:/

In docker container, register Pyarmor with same device regfile. For example::

    root@86b180b28a50:/# pip install pyarmor.cli.core-5.4.1-cp311-none-manylinux1_x86_64.whl
    root@86b180b28a50:/# pip install pyarmor-8.4.1.tar.gz
    root@86b180b28a50:/# pyarmor reg pyarmor-device-regfile-6000.1.zip
    root@86b180b28a50:/# pyarmor -v

If everything is fine, it should print group license information. And then test it with simple script::

    root@86b180b28a50:/# echo "print('hello world')" > foo.py
    root@86b180b28a50:/# pyarmor gen --enable-rft foo.py

When need to verify license, the docker container will send request to docker host. The `pyarmor-auth` console should print auth request from docker container, if there is no any request, please check docker network configuration, make sure IPv4 addresses of docker host and container are in the same network. For example, in docker container::

   root@86b180b28a50:/# ifconfig -a

   eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
         inet 172.17.0.2  netmask 255.255.0.0  broadcast 172.17.255.255
   ...

In docker host::

   $ ifconig -a
   docker0: flags=4099<UP,BROADCAST,MULTICAST>  mtu 1500
            inet 172.17.0.1  netmask 255.255.0.0  broadcast 172.17.255.255
   ...

**MacOS Docker Host**

There is a little difference when docker host is MacOS, because docker container is running in Linux VM, not in MacOS directly.

So one solution is running `pyarmor-auth` in Linux VM, in this case, it should take this Linux VM as offline device, and generate device regfile for this Linux VM, not for **MacOS**, and start docker container with extra options::

    $ docker run --add-host=host.docker.internal:172.17.0.1 ...

In this case, it may need some extra configuration for Linux VM to make sure the machine id could be fixed.

Refer to `issue 1542`__ for more information.

__ https://github.com/dashingsoft/pyarmor/issues/1542

**Windows Docker Host**

For Windows docker host, first check Windows network configuration::

  C:> ipconfig

  Ethernet adapter vEthernet (WSL):

       Connection-specific DNS Suffix  . :
       Link-local IPv6 Address . . . . . : fe80::8984:457:2335:588e%28
       IPv4 Address. . . . . . . . . . . : 172.22.32.1
       Subnet Mask . . . . . . . . . . . : 255.255.240.0
       Default Gateway . . . . . . . . . :

If there is IPv4 Address, for example ``172.22.32.1``, which is in the same network as docker container, it's simple. Just take this Windows as offline device, and run `pyarmor-auth` on it, then start docker container with extra options::

    $ docker run --add-host=host.docker.internal:172.22.32.1 ...

Anyway, `pyarmor-auth` must listen on any IPv4 address which is in the same network as docker container.

If there is no available IPv4 address in Windows, the other solution is running `pyarmor-auth` in WSL, in this case, WSL should be taken as offline device. For example::

    # Create a custom Docker bridge network with a defined subnet
    docker network create --subnet=172.17.0.0/16 pyarmor-net

    # Run the container on this network and point host.docker.internal at the gateway
    docker run --network pyarmor-net --add-host host.docker.internal=172.17.0.1 ...

This makes it explicit that the license check requires host and container to be in the same subnet, not just routable.

Another solution is to run docker with `--network=host`, it make sure docker container has the same netwok netmask with host.

**When something is wrong**

1. Check docker container network:

.. code-block:: bash

   root@86b180b28a50:/# ifconfig -a

   eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
         inet 172.17.0.2  netmask 255.255.0.0  broadcast 172.17.255.255
   ...

   root@86b180b28a50:/# ping host.docker.internal
   PING host.docker.internal (172.17.0.1) 56(84) bytes of data.
   64 bytes from host.docker.internal (172.17.0.1): icmp_seq=1 ttl=64 time=0.048 ms
   ...

If `ping` doesn't works, please check docker host network. If docker host is MacOS, it also checks Linux VM network. If docker host is Windows, also check WSL network.

And make sure IPv4 address of `host.docker.internal` is in same network as `eth0` which IPv4 address is `172.17.0.2`. In above example, it's `172.17.0.1`, so it's OK.

If not, also check docker host network. If docker host is MacOS, it may need run `pyarmor-auth` in Linux VM, not MacOS. If docker host is Windows, it may need run `pyarmor-auth` in WSL, not Windows.

Anyway, please configure the docker host/container network so that `pyarmor-auth` could listen in any IPv4 address which is in the same network as docker container.

2. Check docker host to make sure group license works::

   $ pyarmor -d reg pyarmor-device-regfile-6000.1.zip
   $ pyarmor -v

If run `pyarmor-auth` in Linux VM or WSL, please check group license could work in Linux VM or WSL. It may need generate new device regfile for Linux VM or WSL.

Using multiple Pyarmor Licenses in same device
==============================================

Generally the registration information is stored in the Pyarmor :term:`Home Path`, the default value is :file:`~/.pyarmor`. It means

- All Python virtual environments share same registration information
- It may not work to register other Pyarmor license in same device

When need many Pyarmor Licenses in one machine, set each license to different path. For example::

    $ pyarmor --home ~/.pyarmor1 reg pyarmor-regfile-2051.zip
    $ pyarmor --home ~/.pyarmor1 gen project1/foo.py

    $ pyarmor --home ~/.pyarmor2 reg pyarmor-regfile-2052.zip
    $ pyarmor --home ~/.pyarmor2 gen project2/foo.py

.. _pyarmor:

What need to do after upgrading Pyarmor
=======================================

Generally it need do nothing after upgrading Pyarmor, the registration information still works.

But in the following versions something is changed

- **Pyarmor 8.0**

  Old license for Pyarmor 7 doesn't work

  - Some old licenses can be upgraded to Basic License freely, refer to :ref:`upgrade old license <upgrading old license>`
  - Old license can't be upgraded to Pro or Group License

- **Pyarmor 9.0**

  A big change about using Pyarmor in CI/CD pipeline

  - :term:`Pyarmor Basic`

    - :ref:`upgrade to pyarmor 9` freely
    - If using Pyarmor in CI/CD pipeline, refer to :doc:`ci`

  - :term:`Pyarmor Pro`

    - If not using Pyarmor in CI/CD pipeline, :ref:`upgrade to pyarmor 9` freely
    - If using Pyarmor in CI/CD pipeline, 2 choices

      - Still use Pyarmor 8.x as before
      - Upgrade to Pyarmor 9, and purchase new :term:`Pyarmor CI`

  - :term:`Pyarmor Group`

    It need generate device regfile for each offline device again by Pyarmor 9.0+, refer to :ref:`upgrade to pyarmor 9`

- **Pyarmor 9.2**

  From Pyarmor 9.0+ upgrade to 9.2, something is changed for :term:`Pyarmor CI` and :term:`Pyarmor Group`. If Pyarmor version < 9.0, please also check the changes in above **Pyarmor 9.0**.

  - :term:`Pyarmor CI`

    It need request new ci regfile for new version. The old one still works for old version.

    For example, you have one old ci regfile `pyarmor-ci-8000.zip`, use it for old version.

    After upgrade to Pyarmor 9.2+, request new one `pyarmor-ci-8000.zip`::

        $ pyarmor reg -C pyarmor-regfile-8000.zip

    Then use new one in Pyarmor 9.2+, note that it doesn't work in any prior to versions.

  - :term:`Pyarmor Group`

    It need update device regfile for new version. The old one still works for old version.

    For example, you have old device regfile ``pyarmor-device-regfile-6000.1.zip`` for device no. 1, use it for old version.

    After upgrade to Pyarmor 9.2+, request new one::

        $ pyarmor reg -g 1 /path/to/pyarmor-regfile-6000.zip

    Then use new one in Pyarmor 9.2+, note that it doesn't work in any prior to versions.

.. _upgrading old license:

Upgrading old license
---------------------

Not all the old license (Pyarmor 7) could be upgraded to latest version.

The old license could be upgraded to Pyarmor Basic freely only if it matches these conditions:

* Following new `Pyarmor EULA`_
* The license no. starts with ``pyarmor-vax-``
* The original activation file ``pyarmor-regcode-xxxx.txt`` exists and isn't used more than 100 times
* The old license is purchased before June 1, 2023. In principle, the old license purchased after Pyarmor 8 is available could not be upgraded to new license.

If failed to upgrade the old license, please purchase new license to use Pyarmor latest version.

The old license can't be upgraded to Pyarmor Pro and Group.

**Upgrading old license to Pyarmor Basic**

First find the activation file ``pyarmor-regcode-xxxx.txt``, which is sent to registration email when purchasing the license.

Next install Pyarmor 8.2+, according to new `EULA of Pyarmor`_, each license is only for one product.

Assume this license will be used to obfuscate product ``XXX``, run this command::

    $ pyarmor reg -u -p "XXX" pyarmor-regcode-xxxx.txt

Check the upgraded license information::

    $ pyarmor -v

After upgrade successfully, do not use activation file ``pyarmor-regcode-xxxx.txt`` again, it's invalid now. A new :term:`registration file` like :file:`pyarmor-regfile-xxxx.zip` will be generated at the same time.

In other devices using this new :term:`registration file` to register Pyarmor by this command::

    $ pyarmor reg pyarmor-regfile-xxxx.zip

After successful registration, all obfuscations will automatically apply this license, and each obfuscation requires online license verification.

If old license is used by many products (mainly old personal license), only one product could be used after upgrading. For the others, it need purchase new license.

.. _upgrade to pyarmor 9:

Upgrade to Pyarmor 9
--------------------

1. :term:`Pyarmor Basic` and :term:`Pyarmor Pro`

   **If Pyarmor License has been registered in this device**

   - First upgrade to Pyarmor 9::

         $ pip install -U pyarmor

   - When first time to obfuscate scripts, it will show hints::

         $ pyarmor gen foo.py

         ...
         Pyarmor 9 has big change on CI/CD pipeline
         If not using Pyarmor License in CI/CD pipeline
         Press "c" to continue
         Otherwise press "h" to check Pyarmor 9.0 Upgrade Notes

         Continue (c), Help (h), Quit (q):

   - Just press :kbd:`c` to continue, there is no prompt later

   **If Pyarmor License isn't registered in this device**

   - First use :term:`activation file` to generate new :term:`registration file`::

         $ pip install -U pyarmor

         # Please replace XXX with real product name
         $ pyarmor reg -p XXX pyarmor-regcode-xxxx.txt

   - Save and backup new :term:`registration file` ``pyarmor-regfile-xxxx.zip``

   - Use this new regfile to register Pyarmor in other new device::

         $ pyarmor reg pyarmor-regfile-xxxx.zip
         $ pyarmor -v

   If :term:`activation file` is used too many times, please first install Pyarmor 8, then upgrade to Pyarmor 9

2. :term:`Pyarmor Group` License

   It need generate device regfile again with Pyarmor 9.0+

   - First upgrade to Pyarmor 9::

         $ pip install -U pyarmor

   - Then generate device regfile as before

     For example, generate device regfile ``pyarmor-device-regfile-6000.1.zip`` for device no. 1::

         $ pyarmor reg -g 1 /path/to/pyarmor-regfile-6000.zip

  - Finally, use new one to register Pyarmor in offline device::

         $ pyarmor reg pyarmor-device-regfile-6000.1.zip

.. include:: ../_common_definitions.txt

=================================
 Highest security and performance
=================================

.. contents:: Contents
   :depth: 2
   :local:
   :backlinks: top

.. highlight:: console

.. program:: pyarmor gen

What's the most security pyarmor could do?
==========================================

The following options could improve security

* :option:`--enable-rft` almost doesn't impact performance
* :option:`--enable-bcc` may be a little faster than a plain script, but it consumes more memory to load binary code
* :option:`--enable-jit` prevents static decompilation
* :option:`--enable-themida` prevents most of debuggers, only available in Windows, and reduces performance remarkably
* :option:`--mix-str` protects string constants in the script
* ``pyarmor cfg mix_argnames=1`` may broken annotations
* :option:`--obf-code` ``2`` could make it more difficult to reverse byte code

The following options hide module attributes

* :option:`--private`
* :option:`--restrict` also not allow plain script import obfuscated module

The following options prevent functions or modules from being replaced by hack code

* :option:`--assert-call`
* :option:`--assert-import`

.. important::

   If using :option:`--enable-rft`, please also check :doc:`../topic/rftmode`. The default way is simple to use, but may leave more names not changed. If need rename more names, try to use **rft-auto-include** method.

   If using :option:`--enable-bcc`, please also check :doc:`../topic/rftmode` to make sure most of scripts are converted to C code

What's the best performance pyarmor could do?
=============================================

Using default options and the following settings

* :option:`--obf-code` ``0``
* :option:`--obf-module` ``0``
* ``pyarmor cfg restrict_module=0``

With these options, the security is almost the same as `.pyc`

In order to improve security, and doesn't reduce performance, also enable RFT mode

* :option:`--enable-rft`

If there are sensitive strings, enable mix-str with filter

* ``pyarmor cfg mix.str:includes "/regular expression/"``
* :option:`--mix-str`

Without the filter, all of the string constants in the scripts are encrypted, which may reduce performance. Using filter only encrypt the sensitive string may balance security and performance.

Recommended options for different applications
==============================================

**For Django application or serving web request**

   If RFT mode is safe enough, you can check the transformed scripts to make a decision, using these options

   * :option:`--enable-rft`
   * :option:`--obf-code` ``0``
   * :option:`--obf-module` ``0``
   * :option:`--mix-str` with filter

   If RFT mode is not safe enough, using these options

   * :option:`--enable-rft`
   * :option:`--no-wrap`
   * :option:`--mix-str` with filter

**For most applications and packages**

   If RFT mode and BCC mode are available

   * :option:`--enable-rft`
   * :option:`--enable-bcc`
   * :option:`--mix-str` with filter
   * :option:`--assert-import`

   If RFT mode and BCC mode are not available

   * :option:`--enable-jit`
   * :option:`--private` or :option:`--restrict`
   * :option:`--mix-str` with filter
   * :option:`--assert-import`
   * :option:`--obf-code` ``2``

   If care about monkey trick, also

   * :option:`--assert-call` with inline marker to make sure all the key functions are protected

   If it's not performance sensitive, using :option:`--enable-themida` prevent from debuggers

Reforming scripts to improve security
=====================================

**Move main script module level code to other module**

Pyarmor will clear the module level code after the module is imported, the injected code could not get any module level code because it's gone.

But the main script module level code is never cleared, so moving unnecessary code here to another module could improve security.

Note that for `BCC Mode`, the module level code is not converted to C code, so do not move code to module level if using :option:`--enable-bcc`.

.. include:: ../_common_definitions.txt

=================================
 Work with Third-Party Libraries
=================================

.. contents:: Contents
   :depth: 2
   :local:
   :backlinks: top

.. highlight:: console

.. program:: pyarmor gen

There are countless big packages in the Python world, many packages I never use and which I don't know at all. It's also not easy for me to research a complex package to find which line conflicts with pyarmor, and it's difficult for me to run all of these complex packages on my local machine.

Pyarmor provides rich options to meet various needs, for complex applications, please spend some time checking :doc:`../reference/man` to understand all of these options, one of them may be just for your problem. **I won't learn your application and tell you should use which options**

I'll improve pyarmor and make it work with other libraries as far as possible, but some issues can't be fixed from Pyarmor side.

Generally most of problems for these third party libraries are

* they try to use low level object `frame` to get local variable or other runtime information of obfuscated scripts
* they try to visit code object directly to get something which is just pyarmor protected. The common case is using :mod:`inspect` to get source code.
* they pickle the obfuscated code object and pass it to other processes or threads.

Also check :ref:`the differences of obfuscated scripts`, if third party library uses any feature changed by obfuscated scripts, it will not work with pyarmor. Especially for :term:`BCC mode`, it changes more.

The common solutions to fix third-party libraries issue

- Use RFT mode with ``--obf-code=0``

  RFT mode almost doesn't change internal structure of code object, it transforms the script in source level. :option:`--obf-code` is also required to disable code object obfuscation. The recommended options are like this::

    $ pyarmor gen --enable-rft --obf-code 0 /path/to/myapp

  First make sure it works, then try other options. For example::

    $ pyarmor gen --enable-rft --obf-code 0 --mix-str /path/to/myapp
    $ pyarmor gen --enable-rft --obf-code 0 --mix-str --assert-call /path/to/myapp

- Ignore problem scripts

  If only a few scripts are in trouble, try to obfuscate them with ``--obf-code 0``. For example, if only module ``config.py`` has problem, all the other are fine, then::

    $ pyarmor cfg -p myapp.config obf_code=0
    $ pyarmor gen [other options] /path/to/myapp

  Another way is to copy plain script to overwrite the obfuscated one roughly::

    $ pyarmor gen [other options] /path/to/myapp
    $ cp /path/to/myapp/config.py dist/myapp/config.py

- Patch third-party library

  Here is an example

  .. code-block:: python

      @cherrypy.expose(alias='myapi')
         @cherrypy.tools.json_out()
         # pylint: disable=no-member
         @cherrypy.tools.authenticate()
         @cherrypy.tools.validateOptOut()
         @cherrypy.tools.validateHttpVerbs(allowedVerbs=['POST'])
         # pylint: enable=no-member
         def abc_xyz(self, arg1, arg2):
             """
             This is the doc string
             """

  If call this API with alias name "myapi" it throws me 404 Error and the API's which do not have any alias name works perfectly. Because ``cherrypy.expose`` decorator uses

  .. code-block:: python

      parents = sys._getframe(1).f_locals

  And ``sys._getframe(1)`` return unexpected frame in obfuscated scripts. But it could be fixed by patching this decorator to

  .. code-block:: python

      parents = sys._getframe(2).f_locals

  .. note::

      If :mod:`cheerypy` is also used by others, clone private one.

Third party libraries
=====================

Here are the list of problem libraries and possible solutions. You are welcome to create a pull request to append new libraries (sort alphabetically case insensitivity).

.. list-table:: Table-1. Third party libraries
   :header-rows: 1

   * - Package
     - Status
     - Remark
   * - cherrypy
     - patch work [#patch]_
     - use sys._getframe
   * - `pandas`_
     - patch work [#patch]_
     - use sys._getframe
   * - playwright
     - patch should work [#RFT]_
     - Not verify yet
   * - `nuitka`_
     - Should work with restrict_module = 0
     - Not verify yet
   * - `Cython`_
     - Should work with restrict_module = 0
     -

.. rubric:: Footnotes

.. [#patch] the patched package could work with Pyarmor
.. [#RFT] this package work with Pyarmor RFT mode
.. [#obfcode0] this package only work with ``--obf-code 0``
.. [#not] this package not work with Pyarmor any mode

pandas
------

Another similar example is :mod:`pandas`

.. code-block:: python

    import pandas as pd

    class Sample:
        def __init__(self):
            self.df = pd.DataFrame(
                data={'name': ['Alice', 'Bob', 'Dave'],
                'age': [11, 15, 8],
                'point': [0.9, 0.1, 0.4]}
            )

        def func(self, val: float = 0.5) -> None:
            print(self.df.query('point > @val'))

    sampler = Sample()
    sampler.func(0.3)

After obfuscated, it raises::

    pandas.core.computation.ops.UndefinedVariableError: local variable 'val' is not defined

It could be fixed by changing ``sys._getframe(self.level)`` to ``sys._getframe(self.level+1)``, ``sys._getframe(self.level+2)`` or ``sys._getframe(self.level+3)`` in ``scope.py`` of pandas.

nuitka
------

Because the obfuscated scripts could be taken as normal scripts with an extra runtime package, they also could be translated to C program by Nuitka.

I haven't tested it, but it's easy to verify it.

First disable restrict mode::

    $ pyarmor cfg restrict_module=0

Next use default options to obfuscate the scripts::

    $ pyarmor gen foo.py

Finally nuitka the obfuscated script ``dist/foo.py``, check whether it works or not.

Try more options, but I think restrict options such as :option:`--private`, :option:`--restrict`, :option:`--assert-call`, :option:`--assert-import` may not work.

.. note::

   It may requires v9.0.8+ and non-trial version. Because Nuitka will convert package `pyarmor_runtime_000000/__init__.py` to `pyarmor_runtime_000000_init_.py`, it also results in ``RuntimeError: unauthorized use of script``, this is fixed in v9.0.8

streamlit
---------

It need change default configurations. At least::

    $ pyarmor cfg restrict_module=0
    $ pyarmor cfg clear_module_co=0

This first one solves issue `RuntimeError: unauthorized use of script (1:1102)`

Then second one solves issue `RuntimeError: the format of obfuscated script is incorrect (1:1082)`

Now obfuscate the scripts::

    $ pyarmor gen foo.py

**It may still not work because of Streamlit may patch code object by itself**

Cython
------

Here it's an example show how to `cythonize` a python script `foo.py` obfuscated
by pyarmor::

    print('Hello Cython')

First obfuscate it with some extra options::

    $ pyarmor cfg restrict_module=0
    $ pyarmor gen foo.py
    $ ls dist/
    foo.py pyarmor_runtime_000000

The obfuscated script and runtime files will be saved in the path `dist`

Next `cythonize` the obfuscated script `dist/foo.py` to `foo.c`::

    $ cd dist
    $ cythonize -3 foo.py

Then compile `foo.c` to the extension modules(it may need extra cfalg ``-fPIC`` in some platforms)::

    $ gcc -shared $(python-config --cflags) $(python-config --ldflags) \
          -o foo$(python-config --extension-suffix) foo.c

Finally test it, remove `dist/foo.py` and import the extension module::

    $ rm foo.py
    $ python -c 'import foo'

It will print `Hello Cython` as expected.

.. include:: ../_common_definitions.txt

.. highlight:: console

===========================
 Building obfuscated wheel
===========================

The test-project hierarchy is as follows::

    $ tree test-project

    test-project
    ├── MANIFEST.in
    ├── pyproject.toml
    ├── setup.cfg
    └── src
        └── parent
            ├── child
            │   └── __init__.py
            └── __init__.py

4 directories, 5 files

The content of ``MANIFEST.in`` is::

    recursive-include dist/parent/pyarmor_runtime_00xxxx *.so

The content of ``pyproject.toml`` is:

.. code-block:: ini

    [build-system]
        requires = [
            "setuptools>=66.1.1",
            "wheel"
        ]
        build-backend = "setuptools.build_meta"

The content of ``setup.cfg`` is:

.. code-block:: ini

    [metadata]
        name = parent.child
        version = attr: parent.child.VERSION

    [options]
        package_dir =
            =dist/

        packages =
            parent
            parent.child
            parent.pyarmor_runtime_00xxxx

        include_package_data = True

:file:`src/parent/__init__.py` and :file:`src/parent/child/__init__.py` are the same:

.. code-block:: python

    VERSION = '0.0.1'

First obfuscate the package::

    $ cd test-project
    $ pyarmor gen --recursive -i src/parent

After successful execution the output is the following directory::

    $ tree dist

    dist
    └── parent
        ├── child
        │   ├── __init__.py
        │   └── __pycache__
        │       └── __init__.cpython-311.pyc
        ├── __init__.py
        └── pyarmor_runtime_00xxxx
            ├── __init__.py
            └── pyarmor_runtime.so

Next, build the wheel package::

    $ python -m build --skip-dependency-check --no-isolation

Unfortunately it raises exception:

.. code-block:: python

    * Building sdist...
    Traceback (most recent call last):
      File "/usr/lib/python3/dist-packages/setuptools/config/expand.py", line 81, in __getattr__
        return next(
               ^^^^^
    StopIteration

    The above exception was the direct cause of the following exception:

    Traceback (most recent call last):
      File "/usr/lib/python3/dist-packages/setuptools/config/expand.py", line 191, in read_attr
        return getattr(StaticModule(module_name, spec), attr_name)

From traceback we found it uses ``StaticModule``, then check the source ``/usr/lib/python3/dist-packages/setuptools/config/expand.py`` at line 191 to find class ``StaticModule`` definition. By the source code we know it uses ``ast.parse`` to parse source code directly to get locals. It's impossible for obfuscated scripts, in order to fix this problem, we need insert a line in the ``dist/parent/child/__init__.py`` like this:

.. code-block:: python

    from pyarmor_runtime_00xxxx import __pyarmor__
    VERSION = '0.0.1'
    ...

But pyarmor doesn't allow to change obfuscated scripts by default, it need disable this restriction by this command::

    $ pyarmor cfg -p parent.child.__init__ restrict_module = 0
    $ pyarmor gen --recursive -i src/parent

The option :option:`pyarmor cfg -p` ``parent.child.__init__`` lets pyarmor disable this restriction only for  ``parent/child/__init__.py``.

Now patch ``dist/parent/child/__init__.py`` and rebuild wheel::

    $ python -m build --skip-dependency-check --no-isolation

**Rename runtime package and store it in sub-package**

If you would rather to rename runtime package to ``libruntime`` and store it in the sub-package ``parent.child``, you need change the content of ``MANIFEST.in`` to::

    recursive-include dist/parent/child/libruntime *.so

and change the content of ``setup.cfg`` to::

    [options]
        ...
        packages =
            parent
            parent.child
            parent.child.libruntime
        ...

And obfuscate the scripts by these configurations::

    $ pyarmor cfg package_name_format "libruntime"
    $ pyarmor gen --recursive --prefix parent.child src/parent

Don't forget to patch ``dist/parent/child/__init__.py``, then build wheel::

    $ python -m build --skip-dependency-check --no-isolation

**Further more**

In order to patch ``dist/parent/child/__init__.py`` automatically, you can write a plugin script ``.pyarmor/myplugin.py``:

.. code-block:: python

    __all__ = ['VersionPlugin']

    class VersionPlugin:

        @staticmethod
        def post_build(ctx, inputs, outputs, pack):
            script = os.path.join(outputs[0], 'parent', 'child', '__init__.py')
            with open(script, 'a') as f:
                f.write("\nVERSION = '0.0.1'")

And enable this plugin::

    $ pyarmor cfg plugins + "myplugin"

After that, each build only run the following commands::

    $ pyarmor gen --recursive --prefix parent.child src/parent
    $ python -m build --skip-dependency-check --no-isolation

.. include:: ../_common_definitions.txt


.. highlight:: console

====================
 Advanced Tutorial
====================

.. contents:: Contents
   :depth: 2
   :local:
   :backlinks: top

.. program:: pyarmor gen

.. _using rftmode:

Using rftmode :sup:`pro`
========================

RFT mode could rename most of builtins, functions, classes, local variables. It equals rewriting scripts in source level.

Using :option:`--enable-rft` to enable RTF mode [#]_::

    $ pyarmor gen --enable-rft foo.py

For example, this script

.. code-block:: python
    :linenos:

    import sys

    def sum2(a, b):
        return a + b

    def main(msg):
        a = 2
        b = 6
        c = sum2(a, b)
        print('%s + %s = %d' % (a, b, c))

    if __name__ == '__main__':
        main('pass: %s' % data)

transform to

.. code-block:: python
    :linenos:

    pyarmor__17 = __assert_armored__(b'\x83\xda\x03sys')

    def pyarmor__22(a, b):
        return a + b

    def pyarmor__16(msg):
        pyarmor__23 = 2
        pyarmor__24 = 6
        pyarmor__25 = pyarmor__22(pyarmor__23, pyarmor__24)
        pyarmor__14('%s + %s = %d' % (pyarmor__23, pyarmor__24, pyarmor__25))

    if __name__ == '__main__':
        pyarmor__16('pass: %s' % pyarmor__20)

By default if RFT mode doesn't make sure this name could be changed, it will leave this name as it is.

RFT mode doesn't change names in the module attribute ``__all__``, it also doesn't change function arguments.

For example, this script

.. code-block:: python
    :emphasize-lines: 3,5,9

    import re

    __all__ = ['make_scanner']

    def py_make_scanner(context):
        parse_obj = context.parse_object
        parse_arr = context.parse_array

    make_scanner = py_make_scanner

transform to

.. code-block:: python
    :emphasize-lines: 3,5,9

    pyarmor__3 = __assert_armored__(b'\x83e\x9d')

    __all__ = ['make_scanner']

    def pyarmor__1(context):
        pyarmor__4 = context.parse_object
        pyarmor__5 = context.parse_array

    make_scanner = pyarmor__1

If want to know what're refactored exactly, enable trace rft to generate transformed script [#]_::

    $ pyarmor cfg trace_rft=1
    $ pyarmor gen --enable-rft foo.py

The transformed script will be stored in the path ``.pyarmor/rft``::

    $ cat .pyarmor/rft/foo.py

Now run the obfuscated script::

    $ python dist/foo.py

If something is wrong, try to obfuscate it again, it may make senses::

    $ pyarmor gen --enable-rft foo.py
    $ python dist/foo.py

If it still doesn't work, or you need transform more names, refer to :doc:`../topic/rftmode` to learn more usage.

.. [#] This feature is only available for :term:`Pyarmor Pro`.
.. [#] This feature only works for Python 3.9+

.. _using bccmode:

Using bccmode :sup:`pro`
========================

BCC mode could convert most of functions and methods in the scripts to equivalent C functions, those c functions will be compiled to machine instructions directly, then called by obfuscated scripts.

It requires ``c`` compiler. In Linux and Darwin, ``gcc`` and ``clang`` is OK. In Windows, only ``clang.exe`` works. It could be configured by one of these ways:

* If there is any ``clang.exe``, it's OK if it could be run in other path.
* Download and install Windows version of `LLVM <https://releases.llvm.org>`_
* Download `https://pyarmor.dashingsoft.com/downloads/tools/clang-9.0.zip`, it's about 26M bytes, there is only one file in it. Unzip it and save ``clang.exe`` to ``$HOME/.pyarmor/``. ``$HOME`` is home path of current logon user, check the environment variable ``HOME`` to get the real path.

After compiler works, using :option:`--enable-bcc` to enable BCC mode [#]_::

    $ pyarmor gen --enable-bcc foo.py

All the source in module level is not converted to C function.

To check which functions are converted to C function, enable trace mode before obfuscate the script::

    $ pyarmor cfg enable_trace=1
    $ pyarmor gen --enable-bcc foo.py

Then check the trace log::

    $ ls pyarmor.trace.log
    $ grep trace.bcc pyarmor.trace.log

    trace.bcc            foo:5:hello
    trace.bcc            foo:9:sum2
    trace.bcc            foo:12:main

The first log means ``foo.py`` line 5 function ``hello`` is protected by bcc.
The second log means ``foo.py`` line 9 function ``sum2`` is protected by bcc.

When something is wrong, enable debug mode by common option ``-d``::

    $ pyarmor -d gen --enable-bcc foo.py

Check console log and trace log, most of cases there is modname and line no in console or trace log. Assume the problem function is ``sum2``, then tell BCC mode does not deal with it by this way::

    $ pyarmor cfg -p foo bcc:excludes "sum2"

Use ``-p`` to specify mod-name, and option ``bcc:excludes`` for function name.

Append more functions to exclude by this way::

    $ pyarmor cfg -p foo bcc:excludes + "hello"

When obfuscating package, it also could exclude one script separately. For example, the following commands tell BCC mode doesn't handle ``joker/card.py``, but all the other scripts in package ``joker`` are still handled by BCC mode::

    $ pyarmor cfg -p joker.card bcc:disabled=1
    $ pyarmor gen --enable-bcc /path/to/pkg/joker

It's possible that BCC mode could not support some Python features, in this case, use ``bcc:excludes`` and ``bcc:disabled`` to ignore them, and make all the others work.

If it still doesn't work, or you want to know more about BCC mode, goto :doc:`../topic/bccmode`.

.. [#] This feature is only available for :term:`Pyarmor Pro`.

Customization error handler
===========================

By default when something is wrong with obfuscated scripts, RuntimeError with traceback is printed::

    $ pyarmor gen -e 2020-05-05 foo.py
    $ python dist/foo.py

    Traceback (most recent call last):
      File "dist/foo.py", line 2, in <module>
        from pyarmor_runtime_000000 import __pyarmor__
      File "dist/pyarmor_runtime_000000/__init__.py", line 2, in <module>
        from .pyarmor_runtime import __pyarmor__
    RuntimeError: this license key is expired (1:10937)

If prefer to show error message only::

    $ pyarmor cfg on_error=1

    $ pyarmor gen -e 2020-05-05 foo.py
    $ python dist/foo.py

    this license key is expired (1:10937)

If prefer to quit directly without any message::

    $ pyarmor cfg on_error=2

    $ pyarmor gen -e 2020-05-05 foo.py
    $ python dist/foo.py

    $

Restore the default handler::

    $ pyarmor cfg on_error=0

Or reset this option::

    $ pyarmor cfg --reset on_error

.. note::

   This only works for execute the obfuscated scripts by Python interpreter directly. If :option:`--pack` is used, the script is loaded by `PyInstaller`_ loader, it may not work as expected.

Filter mix string
=================

By default :option:`--mix-str` encrypts all the string length > 8.

But it can be configured to filter any string to meet various needs.

Exclude short strings by length < 10::

    $ pyarmor cfg mix.str:threshold 10

Exclude any string by regular expression with format ``/pattern/``, the pattern syntax is same as module :mod:`re`. For example, exclude all strings length > 1000::

    $ pyarmor cfg mix.str:excludes "/.{1000,}/"

Append new ruler to exclude 2 words ``__main__`` and ``xyz``::

    $ pyarmor cfg mix.str:excludes ^ "__main__ xyz"

Reset exclude ruler::

    $ pyarmor cfg mix.str:excludes = ""

Encrypt only string length between 8 and 32 by regular expression::

    $ pyarmor cfg mix.str:includes = "/.{8,32}/"

Check trace log to find which strings are protected.

.. note::

   This option doesn't touch any docstring

Filter assert function and import
=================================

:option:`--assert-call` and :option:`--assert-import` could protect function and module, but sometimes it may make mistakes.

One case is that pyarmor asserts a third-party function is obfuscated, thus the obfuscated scripts always raise protection error.

Adding an assert rule to fix this problem. For example, tell :option:`--assert-import` ignore module ``json`` and ``inspect`` by word list::

    $ pyarmor cfg assert.import:excludes = "json inspect"

Tell :option:`--assert-call` ignore all the function starts with ``wintype_`` by regular expression::

    $ pyarmor cfg assert.call:excludes "/wintype_.*/"

The other case is that some functions or modules are obfuscated, but pyarmor doesn't protect them. refer to next section `Patching source by inline marker`_ to fix this issue.

Patching source by inline marker
================================

Before obfuscating a script, Pyarmor scans each line, remove inline marker plus the following one white space, leave the rest as it is.

The default inline marker is ``# pyarmor:``, any comment line with this prefix will be as a inline marker.

For example, these lines

.. code-block:: python
    :emphasize-lines: 3,4

    print('start ...')

    # pyarmor: print('this script is obfuscated')
    # pyarmor: check_something()

will be changed to

.. code-block:: python
    :emphasize-lines: 3,4

    print('start ...')

    print('this script is obfuscated')
    check_something()

One real case: protecting hidden imported modules

By default :option:`--assert-import` could only protect modules imported by statement ``import``, it doesn't handle modules imported by other methods.

For example,

.. code-block:: python

    m = __import__('abc')

In obfuscated script, there is a builtin function :func:`__assert_armored__` could be used to check ``m`` is obfuscated. In order to make sure ``m`` could not be replaced by others, check it manually:

.. code-block:: python

    m = __import__('abc')
    __assert_armored__(m)


But this results in a problem, The plain script could not be run because ``__assert_armored__`` is only available in the obfuscated script.

The inline marker is right solution for this case. Let's make a little change

.. code-block:: python
    :emphasize-lines: 2

    m = __import__('abc')
    # pyarmor: __assert_armored__(m)

By inline marker, both the plain script and the obfuscated script work as expected.

Sometimes :option:`--assert-call` may miss some functions, in this case, using inline marker to protect them. Here is an example to protect extra function ``self.foo.meth``:

.. code-block:: python
    :emphasize-lines: 2

    # pyarmor: __assert_armored__(self.foo.meth)
    self.foo.meth(x, y, z)

Internationalization runtime error message
==========================================

Create :file:`messages.cfg` in the path :file:`.pyarmor`::

    $ mkdir .pyarmor
    $ vi .pyarmor/messages.cfg

It's a ``.ini`` format file, add a section ``runtime.message`` with option ``languages``. The language code is same as environment variable ``LANG``, assume we plan to support 2 languages, and only customize 2 errors:

* error_1: license is expired
* error_2: license is not for this machine

.. code:: ini

  [runtime.message]

  languages = zh_CN zh_TW

  error_1 = invalid license
  error_2 = invalid license

``invalid license`` is default message for any non-matched language.

Now add 2 extra sections ``runtime.message.zh_CN`` and ``runtime.message.zh_TW``

.. code:: ini

  [runtime.message]

  languages = zh_CN zh_TW

  error_1 = invalid license
  error_2 = invalid license

  [runtime.message.zh_CN]

  error_1 = 脚本超期
  error_2 = 未授权设备

  [runtime.message.zh_TW]

  error_1 = 腳本許可證已經過期
  error_2 = 腳本許可證不可用於當前設備

Then obfuscate script again to make it works.

When obfuscated scripts start, it checks :envvar:`LANG` to get current language code. If this language code is not ``zh_CN`` or ``zh_TW``, default message is used.

:envvar:`PYARMOR_LANG` could force the obfuscated scripts to use specified language. If it's set, the obfuscated scripts ignore :envvar:`LANG`. For example, force the obfuscated script ``dist/foo.py`` to use lang ``zh_TW`` by this way::

    export PYARMOR_LANG=zh_TW
    python dist/foo.py

.. _generating cross platform scripts:

Generating cross platform scripts
=================================

.. versionadded:: 8.1

Here list all the standard :term:`platform` names.

In order to generate scripts for other platform, use :option:`--platform` specify target platform. For example, building scripts for windows.x86_64 in Darwin::

    $ pyarmor gen --platform windows.x86_64 foo.py

:mod:`pyarmor.cli.runtime` provides prebuilt binaries for these platforms. If it's not installed, pyarmor may complain of ``cross platform need pyarmor.cli.runtime, please run "pip install pyarmor.cli.runtime~=2.1.0" first``. Following the hint to install pyarmor.cli.runtime with the right version.


Using :option:`--platform` multiple times to support multiple platforms. For example, generate the scripts to run in most of x86_64 platforms::

    $ pyarmor gen --platform windows.x86_64
                  --platform linux.x86_64 \
                  --platform darwin.x86_64 \
                  foo.py

.. _support-multiple-python-versions:

Obfuscating scripts for multiple Python versions
================================================

.. versionadded:: 8.3

This guide how to obfuscate the script `foo.py` which works with both Python 3.8 and 3.9.

First install Pyarmor for each Python version::

    $ python3.8 -m pip install pyarmor
    $ python3.9 -m pip install pyarmor

If you have Pyarmor license, register Pyarmor by any Python version::

    $ python3.8 -m pyarmor.cli reg pyarmor-regfile-xxxx.zip

Enable builtin plugin ``MultiPythonPlugin``::

    $ python3.8 -m pyarmor.cli cfg plugins + "MultiPythonPlugin"

Obfuscate the script to different output path by each Python version::

    $ python3.8 -m pyarmor.cli gen -O dist1 foo.py
    $ python3.9 -m pyarmor.cli gen -O dist2 foo.py

Then merge 2 output paths by any Python version::

    $ python3.8 -m pyarmor.cli.merge -O dist dist1 dist2

The final output path is ``dist``::

    $ python3.8 dist/foo.py
    $ python3.9 dist/foo.py

Using shared runtime package
============================

It's possible generating runtime package once and use it later.

First generate runtime package::

    $ pyarmor gen runtime -O build/my_runtime1

Then obfuscate scripts with it::

    $ pyarmor gen --use-runtime build/my_runtime1 foo.py

But it need copy shared runtime package to `dist` path::

    # pyarmor_runtime_000000 need to replaced with real name
    $ ls build/my_runtime1/
    $ cp -a build/my_runime1/pyarmor_runtime_000000 dist/

The other options could be used to generate shared runtime package, for examples::

    $ pyarmor gen runtime -e .10 -O build/my_runtime2
    $ pyarmor gen --platform windows.x86_64,linux.x86_64 build/my_runtime3

If using :term:`outer key` with runtime package, it need specify `--outer` both generating runtime package and obfuscating scripts::

    $ pyarmor gen runtime --outer -O build/my_outer_runtime
    $ pyarmor gen --outer --use-runtime build/my_outer_runtime foo.py

    $ cp -a build/my_outer_runtime/pyarmor_runtime_000000 dist/
    $ pyarmor gen key -e .10
    $ mv dist/pyarmor.rkey dist/pyarmor_runtime_000000

.. _check-pyarmor-7-license:

Working with old runtime key
============================

If still need check Pyarmor 7 runtime key in the obfuscated scripts of Pyarmor 9, here it's one possible solution

The idea is still using Pyarmor 7 obfuscated script to verify old runtime key, in Pyarmor 9 obfuscated script check old runtime key by calling Pyarmor 7 obfuscated script indirectly (IPC)

.. include:: ../_common_definitions.txt


=============================
 Customization and Extension
=============================

.. contents:: Contents
   :depth: 2
   :local:
   :backlinks: top

.. highlight:: console

.. program:: pyarmor gen

Pyarmor provides the following ways to extend:

- Using :ref:`pyarmor cfg` to change default configurations
- Using :term:`plugin script` to customize all generated files
- Using :term:`hook script` to extend features in obfuscated scripts

Changing runtime package name
=============================

.. versionadded:: 8.2 [#]_

By default the runtime package name is ``pyarmor_runtime_xxxxxx``

This name is variable with any valid package name. For example, set it to ``my_runtime``::

    pyarmor cfg package_name_format "my_runtime"

.. [#] Pyarmor trial version could not change runtime package name

Appending assert functions and modules
======================================

.. versionadded:: 8.2

Pyarmor 8.2 introduces configuration item ``auto_mode`` to protect more functions and modules. The default value is ``and``,  :option:`--assert-call` and :option:`--assert-import` only protect modules and functions which Pyarmor make sure they're obfuscated.

If set its value to ``or``, then all the names in the configuration item ``includes`` are also protected. For example, appending function ``foo`` 和 ``koo`` to assert list::

    $ pyarmor cfg ast.call:auto_mode "or"
    $ pyarmor cfg ast.call:includes "foo koo"

    $ pyarmor gen --assert-call foo.py

For example, also protect hidden imported module ``joker.card``::

    $ pyarmor cfg ast.import:auto_mode "or"
    $ pyarmor cfg ast.import:includes "joker.card"

    $ pyarmor gen --assert-import joker/

Using plugin to fix loading issue in darwin
===========================================

.. versionadded:: 8.2

In darwin, if Python is not installed in the standard path, the obfuscated scripts may not work because :term:`extension module` ``pyarmor_runtime`` in the :term:`runtime package` could not be loaded.

Let's check the dependencies of ``pyarmor_runtime.so``::

    $ otool -L dist/pyarmor_runtime_000000/pyarmor_runtime.so

    dist/pyarmor_runtime_000000/pyarmor_runtime.so:

	pyarmor_runtime.so (compatibility version 0.0.0, current version 1.0.0)
        ...
	@rpath/lib/libpython3.9.dylib (compatibility version 3.9.0, current version 3.9.0)
        ...

Suppose :term:`target device` has no ``@rpath/lib/libpython3.9.dylib``, but ``@rpath/lib/libpython3.9.so``, in this case ``pyarmor_runtime.so`` could not be loaded.

We can create a plugin script :file:`.pyarmor/myplugin.py` to fix this problem

.. code-block:: python

    __all__ = ['CondaPlugin']

    class CondaPlugin:

        def _fixup(self, target):
            from subprocess import check_call
            check_call('install_name_tool -change @rpath/lib/libpython3.9.dylib @rpath/lib/libpython3.9.so %s' % target)
            check_call('codesign -f -s - %s' % target)

        @staticmethod
        def post_runtime(ctx, source, target, platform):
            if platform.startswith('darwin.'):
                print('using install_name_tool to fix %s' % target)
                self._fixup(target)

Enable this plugin and generate the obfuscated script again::

    $ pyarmor cfg plugins + "myplugin"
    $ pyarmor gen foo.py

.. seealso:: :ref:`plugins`

Using hook to bind script to docker id
======================================

.. versionadded:: 8.2

Suppose we need bind script ``app.py`` to 2 dockers which id are ``docker-a1`` and ``docker-b2``

First create hook script ``.pyarmor/hooks/app.py``

.. code-block:: python

    def _pyarmor_check_docker():
        cid = None
        with open("/proc/self/cgroup") as f:
            for line in f:
                if line.split(':', 2)[1] == 'name=systemd':
                    cid = line.strip().split('/')[-1]
                    break

        docker_ids = __pyarmor__(0, None, b'keyinfo', 1).decode('utf-8')
        if cid is None or cid not in docker_ids.split(','):
            raise RuntimeError('license is not for this machine')

    _pyarmor_check_docker()

Then generate the obfuscated script, store docker ids to :term:`runtime key` as private data at the same time::

    $ pyarmor gen --bind-data "docker-a1,docker-b2" app.py

Run the obfuscated script to check it, please add print statements in the hook script to debug it.

.. seealso:: :ref:`hooks` :func:`__pyarmor__`

Using hook to check network time by other service
=================================================

.. versionadded:: 8.2

If NTP is not available in the :term:`target device` and the obfuscated scripts has expired date, it may raise ``RuntimeError: Resource temporarily unavailable``.

In this case, using hook script to verify expired data by other time service.

First create hook script in the ``.pyarmor/hooks/foo.py``:

.. code-block:: python

    def _pyarmor_check_worldtime(host, path):
        from http.client import HTTPSConnection
        expired = __pyarmor__(1, None, b'keyinfo', 1)
        conn = HTTPSConnection(host)
        conn.request("GET", path)
        res = conn.getresponse()
        if res.code == 200:
            data = res.read()
            s = data.find(b'"unixtime":')
            n = data.find(b',', s)
            current = int(data[s+11:n])
            if current > expire:
                raise RuntimeError('license is expired')
         else:
             raise RuntimeError('got network time failed')
    _pyarmor_check_worldtime('worldtimeapi.org', '/api/timezone/Europe/Paris')

Then generate script with local expired date::

    $ pyarmor gen -e .30 foo.py

Thus the obfuscated script could verify network time by itself.

.. seealso:: :ref:`hooks` :func:`__pyarmor__`

Protecting extension module pyarmor_runtime
===========================================

.. versionadded:: 8.2

This example shows how to check the file content of an extension module to make sure it's not changed by others.

First create a hook script :file:`.pyarmor/hooks/foo.py`:

.. code-block:: python
    :linenos:
    :emphasize-lines: 7

    def check_pyarmor_runtime(value):
        from pyarmor_runtime_000000 import pyarmor_runtime
        with open(pyarmor_runtime.__file__, 'rb') as f:
            if sum(bytearray(f.read())) != value:
                raise RuntimeError('unexpected %s' % filename)

    check_pyarmor_runtime(EXCEPTED_VALUE)

Line 7 ``EXCEPTED_VALUE`` need to be replaced with real value, but it doesn't work to get the sum value of ``pyarmor_runtime.so`` after building, because each build the sum value is different. We need use a post-runtime plugin to get the expected value and update the hook script automatically

.. code-block:: python

    # Plugin script: .pyarmor/myplugin.py

    __all__ = ['CondaPlugin', 'RuntimePlugin']

    class RuntimePlugin:

        @staticmethod
        def post_runtime(ctx, source, target, platform):
            with open(target, 'rb') as f:
                value = sum(bytearray(f.read()))
            with open('.pyarmor/hooks/foo.py', 'r') as f:
                source = f.read()
            source = source.replace('EXPECTED_VALUE', str(value))
            with open('.pyarmor/hooks/foo.py', 'r') as f:
                f.write(source)

    class CondaPlugin:
        ...

Then enable this plugin::

    $ pyarmor cfg plugins + "myplugin"

Finally generate the obfuscated script, and verify it::

    $ pyarmor gen foo.py
    $ python dist/foo.py

This example is only guide how to do, it's not safe enough to use it directly. There is always a way to bypass open source check points, please write your private check code. There are many other methods to prevent binary file from hacking, please learn and search these methods by yourself.

.. seealso:: :ref:`hooks`

Comments within outer key
=========================

.. versionadded:: 8.2

The :term:`outer key` ignores all the printable text at the header, so it's possible to insert some readable text in the :term:`outer key` as comments.

Post-key plugin is designed to do this. The following example plugin will print all the key information in the console, and write expired date to outer key file:

.. code-block:: python

    # Plugin script: .pyarmor/myplugin.py

    from datetime import datetime

    __all__ = ['CommentPlugin']

    class CommentPlugin:

        @staticmethod
        def post_key(ctx, keyfile, **keyinfo):
            expired = None
            for name, value in keyinfo.items():
                print(name, value)
                if name == 'expired':
                   expired = datetime.fromtimestamp(value).isoformat()

            if expired:
                print('patching runtime key')
                comment = '# expired date: %s\n' % expired
                with open(keyfile, 'rb') as f:
                    keydata = f.read()
                with open(keyfile, 'wb') as f:
                    f.write(comment.encode())
                    f.write(keydata)

Enable this plugin and generate an outer key::

    $ pyarmor cfg plugins + "myplugin"
    $ pyarmor gen key -e 2023-05-06

Check comment::

    $ head -n 1 dist/pyarmor.rkey

.. seealso:: :ref:`plugins`

.. include:: ../_common_definitions.txt



=================
 Getting Started
=================

.. highlight:: console

.. contents:: Content
   :depth: 2
   :local:
   :backlinks: top

New to |Pyarmor|? Well, you came to the right place: read this material to quickly get up and running.

What's Pyarmor
==============

Pyarmor is a command-line tool designed for obfuscating Python scripts, binding obfuscated scripts to specific machines, and setting expiration dates for obfuscated scripts.

Key Features:

- **Seamless Replacement**: Obfuscated scripts remain as standard `.py` files, allowing them to seamlessly replace the original Python scripts in most cases.
- **Balanced Obfuscation**: Offers multiple ways to obfuscate scripts to balance security and performance.
- **Irreversible Obfuscation**: Renames functions, methods, classes, variables, and arguments.
- **C Function Conversion**: Converts some Python functions to C functions and compiles them into machine instructions using high optimization options for irreversible obfuscation.
- **Script Binding**: Binds obfuscated scripts to specific machines or sets expiration dates for obfuscated scripts.
- **Themida Protection**: Protects obfuscated scripts using Themida (Windows only).

Installation from PyPI
======================

Pyarmor_ packages are published on the PyPI_. The preferred tool for installing packages from PyPI_ is :command:`pip`. This tool is provided with all modern versions of Python.

On Linux or MacOS, you should open your terminal and run the following command::

    $ pip install -U pyarmor

On Windows, you should open Command Prompt (:kbd:`Win-r` and type :command:`cmd`) and run the same command:

.. code-block:: doscon

    C:\> pip install -U pyarmor

After installation, type :command:`pyarmor --version` on the command prompt. If everything worked fine, you will see the version number for the Pyarmor_ package you just installed.

Not all the platforms are supported, more information check :doc:`../reference/environments`

Obfuscating one script
======================

.. program:: pyarmor gen

Here it's the simplest command to obfuscate one script :file:`foo.py`::

    $ pyarmor gen foo.py

The command ``gen`` could be replaced with ``g`` or ``generate``::

    $ pyarmor g foo.py
    $ pyarmor generate foo.py

This command generates an obfuscated script :file:`dist/foo.py`, which is a valid Python script, run it by Python interpreter::

    $ python dist/foo.py

Check all generated files in the default output path::

    $ ls dist/
    ...    foo.py
    ...    pyarmor_runtime_000000

There is an extra Python package :file:`pyarmor_runtime_000000`, which is required to run the obfuscated script.

Distributing the obfuscated script
----------------------------------

Only copying :file:`dist/foo.py` to another machine will not work. Instead, copy all the files in the :file:`dist/`.

Why? It's clear after checking the content of :file:`dist/foo.py`:

.. code-block:: python

    from pyarmor_runtime_000000 import __pyarmor__
    __pyarmor__(__name__, __file__, ...)

The obfuscated script can be taken as a normal Python script with dependent package :mod:`pyarmor_runtime_000000`, use it as it's not obfuscated.

.. important::

   Please run this obfuscated in the machine with same Python version and same platform, otherwise it doesn't work. Because :mod:`pyarmor_runtime_000000` has an :term:`extension module`, it's platform-dependent and bind to Python version.

.. note::

   DO NOT install Pyarmor in the :term:`Target Device`, Python interpreter could run the obfuscated scripts without Pyarmor.

Obfuscating one package
=======================

Now let's do a package. :option:`-O` is used to set output path :file:`dist2` different from the default::

    $ pyarmor gen -O dist2 src/mypkg

Check the output::

    $ ls dist2/
    ...    mypkg
    ...    pyarmor_runtime_000000

    $ ls dist2/mypkg/
    ...          __init__.py

All the obfuscated scripts in the :file:`dist2/mypkg`, test it::

    $ cd dist2/
    $ python -C 'import mypkg'

If there are sub-packages, using :option:`-r` to enable recursive mode::

    $ pyarmor gen -O dist2 -r src/mypkg

Distributing the obfuscated package
-----------------------------------

Also it works to copy the whole path :file:`dist2` to another machine. But it's not convenience, the better way is using :option:`-i` to generate all the required files inside package path::

    $ pyarmor gen -O dist3 -r -i src/mypkg

Check the output::

    $ ls dist3/
    ...    mypkg

    $ ls dist3/mypkg/
    ...          __init__.py
    ...          pyarmor_runtime_000000

Now everything is in the package path :file:`dist3/mypkg`, just copy the whole path to any target machine.

.. note::

   Comparing current :file:`dist3/mypkg/__init__.py` with above section :file:`dist2/mypkg/__init__.py` to understand more about obfuscated scripts

Expiring obfuscated scripts
===========================

It's easy to set expire date for obfuscated scripts by :option:`-e`. For example, generate obfuscated script with the expire date to 30 days::

    $ pyarmor gen -O dist4 -e 30 foo.py

Run the obfuscated scripts :file:`dist4/foo.py` to verify it::

    $ python dist4/foo.py

Let's use another form to set past date ``2020-12-31``::

    $ pyarmor gen -O dist4 -e 2020-12-31 foo.py

Now :file:`dist4/foo.py` should not work::

    $ python dist4/foo.py

Distributing the expired script is same as above, copy the whole directory :file:`dist4/` to target machine.

Since v8.5.0, it checks local time by default. If need to check internet time, configure `nts` to any NTP_ server. For example::

   $ pyarmor cfg nts=pool.ntp.org

Actually this is the default configuration in previous versions. Sometimes NTP_ server may return `RuntimeError: Resource temporarily unavailable`, using HTTP service may solve this. For example::

   $ pyarmor cfg nts=http://worldtimeapi.org/api

Binding obfuscated scripts to device
====================================

Since Pyarmor 8.4.6, got target machine hardware informations by `python -m pyarmor.cli.hdinfo`::

    Default Harddisk Serial Number: 'HXS2000CN2A'
    Default Mac address: '00:16:3e:35:19:3d'
    Default IPv4 address: '128.16.4.10'

Before Pyarmor 8.4.6, using `pyarmor-7 hdinfo` to get hardware information.

Using :option:`-b` to bind hardware information to obfuscated scripts. For example, bind :file:`dist5/foo.py` to Ethernet address::

    $ pyarmor gen -O dist5 -b 00:16:3e:35:19:3d foo.py

So :file:`dist5/foo.py` only could run in target machine.

It's same to bind IPv4 and serial number of hard disk::

    $ pyarmor gen -O dist5 -b 128.16.4.10 foo.py
    $ pyarmor gen -O dist5 -b HXS2000CN2A foo.py

It's possible to combine some of them. For example::

    $ pyarmor gen -O dist5 -b "00:16:3e:35:19:3d HXS2000CN2A" foo.py

Only both Ethernet address and hard disk are matched machine could run this obfuscated script.

Distributing scripts bind to device is same as above, copy the whole directory :file:`dist5/` to target machine.

Packaging obfuscated scripts
============================

Remember again, the obfuscated script is normal Python script, use it as it's not obfuscated.

Suppose package ``mypkg`` structure like this::

    projects/
    └── src/
        └── mypkg/
            ├── __init__.py
            ├── utils.py
            └── config.json

First make output path :file:`projects/dist6` for obfuscated package::

    $ cd projects
    $ mkdir dist6

Then copy package data files to output path::

    $ cp -a src/mypkg dist6/

Next obfuscate scripts to overwrite all the ``.py`` files in :file:`dist6/mypkg`::

    $ pyarmor gen -O dist6 -i src/mypkg

The final output::

    projects/
    ├── README.md
    └── src/
        └── mypkg/
            ├── __init__.py
            ├── utils.py
            └── config.json
    └── dist6/
        └── mypkg/
            ├── __init__.py
            ├── utils.py
            ├── config.json
            └── pyarmor_runtime_000000/__init__.py

Comparing with :file:`src/mypkg`, the only difference is :file:`dist6/mypkg` has an extra sub-package ``pyarmor_runtime_000000``. The last thing is packaging :file:`dist6/mypkg` as your prefer way.

New to Python packaging? Refer to `Python Packaging User Guide`_

.. _Python Packaging User Guide: https://packaging.python.org

Something need to know
======================

There is binary `extension module`_ :mod:`pyarmor_runtime` in extra sub-package ``pyarmor_runtime_000000``, here it's package content::

    $ ls dist6/mypkg/pyarmor_runtime_000000
    ...    __init__.py
    ...    pyarmor_runtime.so

Generally using binary extensions means the obfuscated scripts require :mod:`pyarmor_runtime` be created for different platforms, so they

* only works for platforms which provides pre-built binaries, refer to :doc:`../reference/environments`
* may not be compatible with different builds of CPython interpreter. For example, when obfuscating scripts by Python 3.8, they can't be run by Python 3.7, 3.9 etc.
* often will not work correctly with alternative interpreters such as PyPy, IronPython or Jython

Another disadvantage of relying on binary extensions is that alternative import mechanisms (such as the ability to import modules directly from zipfiles) often won't work for extension modules (as the dynamic loading mechanisms on most platforms can only load libraries from disk).

What to read next
=================

There is a complete :doc:`installation <installation>` guide that covers all the possibilities:

* install pyarmor by source
* call pyarmor from Python script
* clean uninstallation

Next is :doc:`obfuscation`. It covers

* using more option to obfuscate script and package
* using outer file to store runtime key
* localizing runtime error messages
* packing obfuscated scripts and protect system packages

And then :doc:`advanced`, some of them are not available in trial pyarmor

* 2 irreversible obfuscation: RFT mode, BCC mode :sup:`pro`
* Customization error handler
* runtime error internationalization
* cross platform, multiple platforms and multiple Python version

Also you may be interesting in this guide :doc:`../how-to/security`

How the documentation is organized
==================================

|Pyarmor| has a lot of documentation. A high-level overview of how it's organized will help you know where to look for certain things:

* :doc:`Part 1: Tutorials <../part-1>` now you're reading.

* :doc:`Part 2: How To <../part-2>` guides are recipes. They guide you through the steps involved in addressing key problems and use-cases. They are more advanced than tutorials and assume some knowledge of how |Python| works.

* :doc:`Part 3: References <../part-3>` guides contain key concepts, man page, configurations and other aspects of |Pyarmor| machinery.

* :doc:`Part 4: Topics <../part-4>` guides insight into key topics and provide useful background information and explanation. They describe how it works and how to use it but assume that you have a basic understanding of key concepts.

* :doc:`Part 5: Licenses <../licenses>` describes EULA of |Pyarmor|, the different |Pyarmor| licenses and how to purchase |Pyarmor| license.

Looking for specific information? Try the :ref:`genindex`, or :ref:`the detailed table of contents <mastertoc>`.

.. include:: ../_common_definitions.txt


==============
 Installation
==============

.. contents:: Contents
   :depth: 2
   :local:
   :backlinks: top

.. highlight:: console

Prerequisite
============

Pyarmor_ requires Python and C library (glibc or musl).

..
  In Linux, please install shared Python runtime library when needed. For example, install Python 3.10 shared runtime library::

      $ apt install libpython3.10

  In Darwin, make sure the file ``@rpath/lib/libpythonX.Y.dylib`` exists. ``X.Y`` stands for  Python major and minor version.

  For example::

      @rpath/lib/libpython3.10.dylib

  ``@rpath`` is one of:

  - @executable_path/..
  - @loader_path/..
  - /System/Library/Frameworks/Python.framework/Versions/3.10
  - /Library/Frameworks/Python.framework/Versions/3.10

  If there is no this file, please install necessary packages or re-build Python with enable shared option, or using `install_name_tool` to adapt current Python installation, refer to :doc:`../question`.

.. _install-pypi:

Installation from PyPI
======================

Pyarmor_ packages are published on the PyPI_. The preferred tool for installing packages from PyPI_ is :command:`pip`. This tool is provided with all modern versions of Python.

On Linux or MacOS, you should open your terminal and run the following command::

    $ pip install pyarmor

On Windows, you should open Command Prompt (:kbd:`Win-r` and type :command:`cmd`) and run the same command:

.. code-block:: doscon

    C:\> pip install pyarmor

After installation, type :command:`pyarmor --version` on the command prompt. If everything worked fine, you will see the version number for the Pyarmor_ package you just installed.

If you need generate obfuscated scripts to run in other platforms, install the corresponding packages::

    $ pip install pyarmor.cli.core.windows
    $ pip install pyarmor.cli.core.themida
    $ pip install pyarmor.cli.core.linux
    $ pip install pyarmor.cli.core.darwin
    $ pip install pyarmor.cli.core.freebsd
    $ pip install pyarmor.cli.core.android
    $ pip install pyarmor.cli.core.alpine

Not all the platforms are supported, more information check :doc:`../reference/environments`

.. note::

    If only using Pyarmor 8+ features, installing :mod:`pyarmor.cli` instead of :mod:`pyarmor`, could significantly decrease downloaded file size. For example::

        $ pip install pyarmor.cli

.. note::

   If need install old version Pyarmor, just specify the exact version. For example::

       $ pip install pyarmor==8.5.12

   For more information, please check `pip` doc

Installed command
-----------------

* :program:`pyarmor` is the main command to do everything. See :doc:`../reference/man`.
* :program:`pyarmor-7` is used to call old commands, it equals bug fixed Pyarmor 7.x
* :program:`pyarmor-auth` used by Group License to support unlimited docker containers

Start Pyarmor by Python interpreter
-----------------------------------

:program:`pyarmor` is same as the following command::

    $ python -m pyarmor.cli

Using virtual environments
==========================

When installing Pyarmor_ using :command:`pip`, use *virtual environments* which could isolate the installed packages from the system packages, thus removing the need to use administrator privileges.  To create a virtual environment in the ``.venv`` directory, use the following command::

    $ python -m venv .venv

You can read more about them in the `Python Packaging User Guide`_.

.. _Python Packaging User Guide: https://packaging.python.org/guides/installing-using-pip-and-virtual-environments/#creating-a-virtual-environment

Installation from source
========================

.. deprecated:: 8.2.9

You can install Pyarmor_ directly from a clone of the `Git repository`__.  This can be done either by cloning the repo and installing from the local clone, on simply installing directly via :command:`git`::

    $ git clone https://github.com/dashingsoft/pyarmor
    $ cd pyarmor
    $ pip install .

You can also download a snapshot of the Git repo in either `tar.gz`__ or `zip`__ format.  Once downloaded and extracted, these can be installed with :command:`pip` as above.

.. note::

   Do not use this method, it may not work since v8.2.9

__ https://github.com/dashingsoft/pyarmor
__ https://github.com/dashingsoft/pyarmor/archive/master.tar.gz
__ https://github.com/dashingsoft/pyarmor/archive/master.zip

Installation in offline device
==============================

All the Pyarmor pacakges are published in the PyPI_, download them and copy to offlice device.

First install :mod:`pyarmor.cli.core`

Next install :mod:`pyarmor` or :mod:`pyarmor.cli`

For example, install offline Pyarmor 8.2.9 in Linux for Python 3.10::

    $ pip install pyarmor.cli.core-3.2.9-cp310-none-manylinux1_x86_64.whl
    $ pip install pyarmor-8.2.9.zip

In Android or FreeBSD, there is no wheel in :mod:`pyarmor.cli.core`, it should install source distribution and extra package :mod:`pyarmor.cli.core.android` or :mod:`pyarmor.cli.core.freebsd`. For example, install offline Pyarmor in Android for Python 3.10::

    $ pip install pyarmor.cli.core-3.2.9.zip
    $ pip install pyarmor.cli.core.android-3.2.9-cp310-none-any.whl
    $ pip install pyarmor-8.2.9.zip

For some arches like `ppc64le`, `mips32el`, `mips64el`, `riscv64`, `loongarch64`, it need install `pyarmor.cli.core.linux` (glibc) or `pyarmor.cli.core.alpine` (musl). For example::

    $ pip install pyarmor.cli.core-8.5.9.zip
    $ pip install pyarmor.cli.core.linux-6.5.2-cp310-none-any.whl
    $ pip install pyarmor.cli-8.5.9.zip

If need cross platform obfuscation, also install the corresponding platform package

- :mod:`pyarmor.cli.core.freebsd`
- :mod:`pyarmor.cli.core.android`
- :mod:`pyarmor.cli.core.windows`
- :mod:`pyarmor.cli.core.themida`
- :mod:`pyarmor.cli.core.linux`
- :mod:`pyarmor.cli.core.alpine`
- :mod:`pyarmor.cli.core.darwin`

For example, if need Themida protection, then install themida package::

    $ pip install pyarmor.cli.themida-3.2.9-cp310-none-any.whl

In Linux to generate for Windows, install windows package::

    $ pip install pyarmor.cli.windows-3.2.9-cp310-none-any.whl

If only using Pyarmor 8+ features, it's recommend to install :mod:`pyarmor.cli` instead of :mod:`pyarmor`, the former file size is significantly less than the latter. For example::

    $ pip install pyarmor.cli-8.2.9.zip

Termux issues
=============

In Termux, after installation it need patch extensions. For example::

    $ patchelf --add-needed libpython3.11.so.0.1 /data/data/com.termux/files/usr/lib/python3.11/site-packages/pyarmor/cli/core/android/aarch64/pytransform3.so
    $ patchelf --add-needed libpython3.11.so.0.1 /data/data/com.termux/files/usr/lib/python3.11/site-packages/pyarmor/cli/core/android/aarch64/pyarmor_runtime.so

Sometimes, it need set runpath too. For example::

    $ patchelf --set-rpath /data/data/com.termux/files/usr/lib /path/to/{pytransform3,pyarmor_runtime}.so

Otherwise it will raise error `dlopen failed: cannot locate symbol "PyFloat_Type"`

Run Pyarmor from Python script
==============================

Create a script :file:`tool.py`, pass arguments by yourself

For example,

.. code-block:: python

    from pyarmor.cli.__main__ import main_entry

    args = ['gen', '-O', 'dist', '--platform', 'linux.x86_64,windows.x86_64', 'foo.py']
    main_entry(args)

Run it by Python interpreter::

    $ python tool.py

It's same as this command::

    $ pyarmor gen -O dist --platform linux.x86_64,windows.x86_64 foo.py

Clean uninstallation
====================

Run the following commands to make a clean uninstallation::

    $ pip uninstall pyarmor
    $ pip uninstall pyarmor.cli.core

    $ pip uninstall pyarmor.cli.runtime
    $ pip uninstall pyarmor.cli.core.windows
    $ pip uninstall pyarmor.cli.core.themida
    $ pip uninstall pyarmor.cli.core.linux
    $ pip uninstall pyarmor.cli.core.darwin
    $ pip uninstall pyarmor.cli.core.freebsd
    $ pip uninstall pyarmor.cli.core.android
    $ pip uninstall pyarmor.cli.core.alpine

    $ rm -rf ~/.pyarmor
    $ rm -rf ./.pyarmor

.. note::

   The path ``~`` may be different when logging by different user. ``$HOME`` is home path of current logon user, check the environment variable ``HOME`` to get the real path.

.. highlight:: default

.. Most Windows users do not have Python installed by default, so we begin with the installation of Python itself.  To check if you already have Python installed, open the *Command Prompt* (:kbd:`Win-r` and type :command:`cmd`). Once the command prompt is open, type :command:`python --version` and press Enter.  If Python is installed, you will see the version of Python printed to the screen.  If you do not have Python installed, refer to the `Hitchhikers Guide to Python's`__ Python on Windows installation guides. You must install `Python 3`__.

   Once Python is installed, you can install Sphinx using :command:`pip`.  Refer to the :ref:`pip installation instructions <install-pypi>` below for more information.

   __ https://docs.python-guide.org/
   __ https://docs.python-guide.org/starting/install3/win/


.. include:: ../_common_definitions.txt

===================
 Basic Tutorial
===================

.. contents:: Contents
   :depth: 2
   :local:
   :backlinks: top

.. highlight:: console

.. program:: pyarmor

We'll assume you have Pyarmor 8.0+ installed already. You can tell Pyarmor is installed and which version by running the following command in a shell prompt (indicated by the $ prefix)::

    $ pyarmor --version

If Pyarmor is installed, you should see the version of your installation. If it isn't, you'll get an error.

This tutorial is written for Pyarmor 8.0+, which supports Python 3.7 and later. If the Pyarmor version doesn't match, you can refer to the tutorial for your version of Pyarmor by using the version switcher at the bottom right corner of this page, or update Pyarmor to the newest version.

Throughout this tutorial, assume run :command:`pyarmor` in project path which includes::

    project/
        ├── foo.py
        ├── queens.py
        └── joker/
            ├── __init__.py
            ├── queens.py
            └── config.json

Pyarmor uses :ref:`pyarmor gen` with rich options to obfuscate scripts to meet the needs of different applications.

Here only introduces common options in a short, using any combination of them as needed. About usage of each option in details please refer to :ref:`pyarmor gen`

Debug mode and trace log
========================

When something is wrong, check console log to find what Pyarmor does, and use :option:`-d` to generate :file:`pyarmor.debug.log` to get more information::

    $ pyarmor -d gen foo.py
    $ cat pyarmor.debug.log

Trace log is useful to check whatever protected by Pyarmor, enable it by this command::

    $ pyarmor cfg enable_trace=1

After that, :ref:`pyarmor gen` will generate a logfile :file:`pyarmor.trace.log`. For example::

    $ pyarmor gen foo.py
    $ cat pyarmor.trace.log

    trace.co             foo:1:<module>
    trace.co             foo:5:hello
    trace.co             foo:9:sum2
    trace.co             foo:12:main

Each line starts with ``trace.co`` is reported by code object protector. The first log says ``foo.py`` module level code is obfuscated, second says function ``hello`` at line 5 is obfuscated, and so on.

Enable both debug and trace mode could show much more information::

    $ pyarmor -d gen foo.py

Disable trace log by this command::

    $ pyarmor cfg enable_trace=0

.. program:: pyarmor gen

More options to protect script
==============================

For scripts, use these options to get more security::

    $ pyarmor gen --enable-jit --mix-str --assert-call --private foo.py

Using :option:`--enable-jit` tells Pyarmor processes some sensitive data by ``c`` function generated in runtime.

Using :option:`--mix-str` [#]_ could mix the string constant (length > 8) in the scripts.

Using :option:`--assert-call` makes sure function is obfuscated, to prevent called function from being replaced by special ways

Using :option:`--private` prevents plain scripts visiting module attributes

For example,

.. code-block:: python
    :emphasize-lines: 1,10

    data = "abcefgxyz"

    def fib(n):
        a, b = 0, 1
        while a < n:
            print(a, end=' ')
            a, b = b, a+b

    if __name__ == '__main__':
        fib(n)

String constant ``abcefgxyz`` and function ``fib`` will be protected like this

.. code-block:: python
    :emphasize-lines: 1,10

    data = __mix_str__(b"******")

    def fib(n):
        a, b = 0, 1
        while a < n:
            print(a, end=' ')
            a, b = b, a+b

    if __name__ == '__main__':
        __assert_call__(fib)(n)

If function ``fib`` is obfuscated, ``__assert_call__(fib)`` returns original function ``fib``. Otherwise it will raise protection exception.

To check which function or which string are protected, enable trace log and check trace logfile::

    $ pyarmor cfg enable_trace=1
    $ pyarmor gen --mix-str --assert-call fib.py
    $ cat pyarmor.trace.log

    trace.assert.call    fib:10:'fib'
    trace.mix.str        fib:1:'abcxyz'
    trace.mix.str        fib:9:'__main__'
    trace.co             fib:1:<module>
    trace.co             fib:3:fib

.. [#] :option:`--mix-str` is not available in trial version

More options to protect package
===============================

For package, remove :option:`--private` and append 2 extra options::

    $ pyarmor gen --enable-jit --mix-str --assert-call --assert-import --restrict joker/

Using :option:`--assert-import` prevents obfuscated modules from being replaced with plain script. It checks each import statement to make sure the modules are obfuscated.

Using :option:`--restrict` makes sure the obfuscated module is only available inside package. It couldn't be imported from any plain script, also not be run by Python interpreter.

By default ``__init__.py`` is not restricted, all the other modules are invisible from outside. Let's check this, first create a script :file:`dist/a.py`

.. code-block:: python

    import joker
    print('import joker OK')
    from joker import queens
    print('import joker.queens OK')

Then run it::

    $ cd dist
    $ python a.py
    ... import joker OK
    ... RuntimeError: unauthorized use of script

In order to export ``joker.queens``, either removing option :option:`--restrict`, or config only this module is not restrict like this::

    $ pyarmor cfg -p joker.queens restrict_module=0

Then obfuscate this package with restrict mode::

    $ pyarmor gen --restrict joker/

Now do above test again, it should work::

    $ cd dist/
    $ python a.py
    ... import joker OK
    ... import joker.queens

.. _using readonly module:

Using readonly module
---------------------

.. versionadded:: 9.1.9

Readonly module is one simple way to protect the obfuscated package, it only allows the plain scripts import and read the obfuscated module, but can't write or change any attribute or method of obfuscated modules.

Enable readonly module by this way::

    $ pyarmor cfg readonly_module=1

Then obfuscate the whole package::

    $ pyarmor gen --enable-jit --mix-str joker/

Test it::

    $ cd dist
    $ python
    >>> import joker
    >>> dir(joker)
    >>> joker.aaa = 1
    Traceback (most recent call last):
      File "<stdin>", line 1, in <module>
    RuntimeError: protection exception (16782406)

If only need export a few modules, for example, `joker.card` and `joker.__init__`, the other modules in the package need not be exported, the best way is like these::

    $ pyarmor cfg readonly_module=1
    $ pyarmor cfg exclude_restrict_modules="__init__ joker.card"
    $ pyarmor gen --enable-jit --mix-str --assert-call --assert-import --restrict joker/

The modules list in the `exclude_restrict_modules` are readonly, all the others are more restricted.

Copying package data files
==========================

Many packages have data files, but they're not copied to output path.

There are 2 ways to solve this problem:

1. Before generating the obfuscated scripts, copy the whole package to output path, then run :ref:`pyarmor gen` to overwrite all the ``.py`` files::

     $ mkdir dist/joker
     $ cp -a joker/* dist/joker
     $ pyarmor gen -O dist -r joker/

2. Changing default configuration let Pyarmor copy data files::

     $ pyarmor cfg data_files=*
     $ pyarmor gen -O dist -r joker/

Only copy ``*.yaml`` and ``*.json``::

     $ pyarmor cfg data_files="*.yaml *.json"

Checking runtime key periodically
=================================

Checking runtime key every hour::

    $ pyarmor gen --period 1 foo.py

Binding to many machines
========================

Using :option:`-b` many times to bind obfuscated scripts to many machines.

For example, machine A and B, the ethernet addresses are ``66:77:88:9a:cc:fa`` and ``f8:ff:c2:27:00:7f`` respectively. The obfuscated script could run in both of machine A and B by this command ::

    $ pyarmor gen -b "66:77:88:9a:cc:fa" -b "f8:ff:c2:27:00:7f" foo.py

Using outer file to store runtime key
=====================================

First obfuscating script with :option:`--outer`::

    $ pyarmor gen --outer foo.py

In this case, it could not be run at this time::

    $ python dist/foo.py

Let generate an outer runtime key valid for 3 days by this command::

    $ pyarmor gen key -e 3

It generates a file ``dist/pyarmor.rkey``, copy it to runtime package::

    $ cp dist/pyarmor.rkey dist/pyarmor_runtime_000000/

Now run :file:`dist/foo.py` again::

    $ python dist/foo.py

Let's generate another license valid for 10 days::

    $ pyarmor gen key -O dist/key2 -e 10

    $ ls dist/key2/pyarmor.rkey

Copy it to runtime package to replace the original one::

    $ cp dist/key2/pyarmor.rkey dist/pyarmor_runtime_000000/

The outer runtime key file also could be saved to other paths, refer to :term:`outer key`.

Localization runtime error
==========================

Some of runtime error messages could be customized. When something is wrong with the obfuscated scripts, it prints your own messages.

First create :file:`messages.cfg` in the path :file:`.pyarmor`::

    $ mkdir .pyarmor
    $ vi .pyarmor/messages.cfg

Then edit it. It's a ``.ini`` format file, change the error messages as needed

.. code-block:: ini

  [runtime.message]

    error_1 = this license key is expired
    error_2 = this license key is not for this machine
    error_3 = missing license key to run the script
    error_4 = unauthorized use of script

Now obfuscate the script in the current path to use customized messages::

    $ pyarmor gen foo.py

If we want to show same message for all of license errors, edit it like this

.. code-block:: ini

  [runtime.message]

    error_1 = invalid license key
    error_2 = invalid license key
    error_3 = invalid license key

Here no ``error_4``, it means this error uses the default message.

And then obfuscate the scripts again.

Packing obfuscated scripts
==========================

Pyarmor need PyInstaller to pack the obfuscated scripts, so first make sure PyInstaller has been installed. If not, simple install it by this command::

    $ pip install pyinstaller

Packing to one file
-------------------

.. versionadded:: 8.5.4

Packing script to one file only need one command::

    $ pyarmor gen --pack onefile foo.py

Run the final bundle::

    $ dist/foo

Pyarmor will automatically obfuscate `foo.py` and all the other used modules and packages in the same path, then pack the obfuscated to one bundle.

.. important::

   Please pass plain script in command line, for example, `foo.py` should not been obfuscated.

Packing to one folder
---------------------

.. versionadded:: 8.5.4

Packing script to one folder::

    $ pyarmor gen --pack onedir foo.py

Run the final bundle::

    $ dist/foo/foo

Using .spec file
----------------

.. versionadded:: 8.5.8

If the plain script has been packed by one spec file. For example::

    $ pyinstaller foo.spec
    $ dist/foo

Then pass this specfile to :option:`--pack` to let Pyarmor pack the obfuscated scripts. For example::

    $ pyarmor gen --pack foo.spec -r foo.py joker/
    $ dist/foo

Note that all the other scripts or packages must be list after main script, otherwise they won't be obfuscated by this way.

More information about pack feature, refer to :doc:`../topic/repack`

.. include:: ../_common_definitions.txt


